import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
import Transaction from '@/models/Transaction';
import Invoice from '@/models/Invoice';
import { getAuthUser } from '@/lib/auth';
import { generateOrderNumber } from '@/lib/numberGenerator';
import { errorResponse, parsePagination } from '@/lib/apiHelpers';
import { createLogger } from '@/lib/logger';

// Configure route for production
export const maxDuration = 30; // Maximum execution time in seconds
export const dynamic = 'force-dynamic'; // Disable caching

const logger = createLogger('OrdersAPI');

// GET all orders
export async function GET(request) {
  let authUser;
  try {
    authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Verify connection is ready
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection not ready');
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer');
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const dateFilter = searchParams.get('date'); // today, week, month
    const monthFilter = searchParams.get('month'); // YYYY-MM format
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'date'; // 'date' or 'orderNumber'
    const { page, limit, skip } = parsePagination(searchParams);

    // Filter by logged-in user (createdBy) - Admin sees all orders
    const filter = authUser.role === 'admin' ? {} : { createdBy: authUser.userId };

    // Filter by customer
    if (customerId) {
      filter.customer = customerId;
    }

    // Filter by status
    if (status) {
      filter.status = status;
    }

    // Filter by payment status
    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    // Search filter - search in order number, guest info, and customer names
    let searchConditions = [];
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      
      // First, find customers matching the search
      const matchingCustomers = await Customer.find({
        $or: [
          { name: searchRegex },
          { phone: searchRegex }
        ]
      }).select('_id').lean();
      
      const customerIds = matchingCustomers.map(c => c._id);
      
      // Build search conditions
      searchConditions = [
        { orderNumber: searchRegex },
        { 'guestInfo.name': searchRegex },
        { 'guestInfo.phone': searchRegex }
      ];
      
      // Add customer IDs to search if any found
      if (customerIds.length > 0) {
        searchConditions.push({ customer: { $in: customerIds } });
      }
    }

    // Date filter conditions
    let dateConditions = [];
    
    // Month filter (specific month in YYYY-MM format) - use deliveryDate or createdAt
    if (monthFilter && monthFilter !== 'all') {
      const [year, month] = monthFilter.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      
      dateConditions = [
        { deliveryDate: { $gte: startDate, $lte: endDate } },
        { deliveryDate: { $exists: false }, createdAt: { $gte: startDate, $lte: endDate } },
        { deliveryDate: null, createdAt: { $gte: startDate, $lte: endDate } }
      ];
    }
    // Date filters (only apply if month filter is not set) - use deliveryDate or createdAt
    else if (dateFilter && dateFilter !== 'all') {
      const now = new Date();
      let startDate;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
      }

      if (startDate) {
        dateConditions = [
          { deliveryDate: { $gte: startDate } },
          { deliveryDate: { $exists: false }, createdAt: { $gte: startDate } },
          { deliveryDate: null, createdAt: { $gte: startDate } }
        ];
      }
    }

    // Combine search and date conditions properly
    if (searchConditions.length > 0 && dateConditions.length > 0) {
      // Both search and date filters - use $and with nested $or
      filter.$and = [
        { $or: searchConditions },
        { $or: dateConditions }
      ];
    } else if (searchConditions.length > 0) {
      // Only search filter
      filter.$or = searchConditions;
    } else if (dateConditions.length > 0) {
      // Only date filter
      filter.$or = dateConditions;
    }

    // Determine sort order
    let sortOrder = {};
    if (sortBy === 'orderNumber') {
      sortOrder = { orderNumber: -1 }; // Sort by order number descending
    } else {
      sortOrder = { deliveryDate: -1, createdAt: -1 }; // Sort by delivery date first, then creation date
    }

    // Log filter for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      logger.info('Orders filter:', JSON.stringify(filter, null, 2));
    }

    // Execute queries in parallel for better performance
    let orders, totalOrders;
    
    try {
      // Validate filter object before querying
      if (filter.$and && (!Array.isArray(filter.$and) || filter.$and.length === 0)) {
        delete filter.$and;
      }
      if (filter.$or && (!Array.isArray(filter.$or) || filter.$or.length === 0)) {
        delete filter.$or;
      }

      [orders, totalOrders] = await Promise.all([
        Order.find(filter)
          .select('orderNumber orderType customer guestInfo items totalAmount discount tax finalAmount status paymentStatus paidAmount paymentMethod deliveryDate notes invoice createdAt')
          .populate('customer', 'name phone')
          .populate('items.product', 'name sku')
          .populate('createdBy', 'name')
          .populate('assignedTo', 'name')
          .populate('invoice', 'invoiceNumber status paidAmount balanceAmount')
          .sort(sortOrder)
          .skip(skip)
          .limit(limit)
          .lean() // Use lean() for better performance
          .maxTimeMS(25000), // Add query timeout for production
        Order.countDocuments(filter).maxTimeMS(10000)
      ]);
    } catch (queryError) {
      logger.error('MongoDB query error:', queryError);
      logger.error('Filter that caused error:', JSON.stringify(filter, null, 2));
      
      // Check if it's a timeout error
      if (queryError.name === 'MongooseError' && queryError.message.includes('buffering timed out')) {
        throw new Error('Database connection timeout. Please try again.');
      }
      
      if (queryError.name === 'MongoServerError' && queryError.code === 50) {
        throw new Error('Query took too long to execute. Please refine your search.');
      }
      
      throw new Error(`Database query failed: ${queryError.message}`);
    }

    const totalPages = Math.ceil(totalOrders / limit);

    // logger.info(`Fetched ${orders.length} orders`, { userId: authUser.userId, page, limit, totalOrders });

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalOrders,
        itemsPerPage: limit,
        hasMore: page < totalPages,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    logger.error('Get orders error', error);
    
    // Return more specific error message with stack trace in development
    return NextResponse.json(
      { 
        error: 'Failed to fetch orders',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          filter: JSON.stringify(filter || {}),
        } : undefined
      },
      { status: 500 }
    );
  }
}

// POST create new order
export async function POST(request) {
  let authUser;
  try {
    authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      orderType,
      customer,
      guestInfo,
      items,
      discount,
      tax,
      status,
      paymentStatus,
      paidAmount,
      paymentMethod,
      deliveryAddress,
      deliveryDate,
      notes,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Please provide order items' },
        { status: 400 }
      );
    }

    // Validate order type
    const isGuestOrder = orderType === 'guest';
    
    if (!isGuestOrder && !customer) {
      return NextResponse.json(
        { error: 'Please provide customer for regular orders' },
        { status: 400 }
      );
    }

    if (isGuestOrder && (!guestInfo || !guestInfo.name)) {
      return NextResponse.json(
        { error: 'Please provide guest name for guest orders' },
        { status: 400 }
      );
    }

    await connectDB();

    let customerDoc = null;
    
    // Validate customer exists for regular orders
    if (!isGuestOrder) {
      customerDoc = await Customer.findById(customer);
      if (!customerDoc) {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }
    }

    // Validate products and calculate totals
    let subtotalAtOriginalPrice = 0;
    let subtotalAtCustomPrice = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.product}` },
          { status: 404 }
        );
      }

      // Check stock availability
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}. Available: ${product.stock}` },
          { status: 400 }
        );
      }

      // Calculate at original price
      const originalPrice = parseFloat(product.price);
      const originalSubtotal = item.quantity * originalPrice;
      subtotalAtOriginalPrice += originalSubtotal;

      // Use custom price if provided, otherwise use product price
      const itemPrice = item.customPrice ? parseFloat(item.customPrice) : originalPrice;
      const customSubtotal = item.quantity * itemPrice;
      subtotalAtCustomPrice += customSubtotal;

      validatedItems.push({
        product: product._id,
        quantity: item.quantity,
        price: itemPrice, // Store the actual selling price (custom or original)
        subtotal: customSubtotal,
      });

      // Reduce stock
      product.stock -= item.quantity;
      await product.save();
    }

    // Calculate discount as difference between original and custom pricing
    const calculatedDiscount = subtotalAtOriginalPrice - subtotalAtCustomPrice;
    const discountAmount = calculatedDiscount > 0 ? calculatedDiscount : (parseFloat(discount) || 0);
    const taxAmount = parseFloat(tax) || 0;
    
    // Total amount is at original prices, final amount is after discount and tax
    const totalAmount = subtotalAtOriginalPrice;
    const finalAmount = subtotalAtCustomPrice + taxAmount;

    // Generate unique order number using utility function
    const orderNumber = generateOrderNumber();

    // Prepare order data
    const orderData = {
      orderNumber,
      orderType: isGuestOrder ? 'guest' : 'customer',
      items: validatedItems,
      totalAmount,
      discount: discountAmount,
      tax: taxAmount,
      finalAmount,
      status: status || 'pending',
      paymentStatus: paymentStatus || 'unpaid',
      paidAmount: parseFloat(paidAmount) || 0,
      paymentMethod: paymentMethod || 'cash',
      deliveryDate,
      notes,
      createdBy: authUser.userId,
      assignedTo: authUser.userId,
    };

    // Add customer or guest info
    if (isGuestOrder) {
      orderData.guestInfo = {
        name: guestInfo.name,
        phone: guestInfo.phone || '',
        address: guestInfo.address || '',
      };
      orderData.deliveryAddress = guestInfo.address || deliveryAddress;
    } else {
      orderData.customer = customer;
      orderData.deliveryAddress = deliveryAddress || customerDoc.address;
    }

    const order = await Order.create(orderData);

    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name phone email address')
      .populate('items.product', 'name sku size bottlesPerCarton')
      .populate('createdBy', 'name email');

    return NextResponse.json(
      {
        success: true,
        order: populatedOrder,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Create order error', error);
    
    // Return more specific error message
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create order',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
