import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
import Transaction from '@/models/Transaction';
import Invoice from '@/models/Invoice';
import { getAuthUser } from '@/lib/auth';
import { generateOrderNumber } from '@/lib/numberGenerator';
import { errorResponse, parsePagination } from '@/lib/apiHelpers';
import { createLogger } from '@/lib/logger';

const logger = createLogger('OrdersAPI');

// GET all orders
export async function GET(request) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

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

    // Search filter - use database query instead of in-memory filtering
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { orderNumber: searchRegex },
        { 'guestInfo.name': searchRegex },
        { 'guestInfo.phone': searchRegex }
      ];
    }

    // Month filter (specific month in YYYY-MM format) - use deliveryDate or createdAt
    if (monthFilter && monthFilter !== 'all') {
      const [year, month] = monthFilter.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      
      // Match orders where deliveryDate OR createdAt is in the selected month
      if (!filter.$or) {
        filter.$or = [];
      }
      filter.$or.push(
        { deliveryDate: { $gte: startDate, $lte: endDate } },
        { deliveryDate: { $exists: false }, createdAt: { $gte: startDate, $lte: endDate } },
        { deliveryDate: null, createdAt: { $gte: startDate, $lte: endDate } }
      );
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
        // Match orders where deliveryDate OR createdAt is after startDate
        if (!filter.$or) {
          filter.$or = [];
        }
        filter.$or.push(
          { deliveryDate: { $gte: startDate } },
          { deliveryDate: { $exists: false }, createdAt: { $gte: startDate } },
          { deliveryDate: null, createdAt: { $gte: startDate } }
        );
      }
    }

    // Determine sort order
    let sortOrder = {};
    if (sortBy === 'orderNumber') {
      sortOrder = { orderNumber: -1 }; // Sort by order number descending
    } else {
      sortOrder = { deliveryDate: -1, createdAt: -1 }; // Sort by delivery date first, then creation date
    }

    // Execute queries in parallel for better performance
    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .select('orderNumber orderType customer guestInfo items totalAmount discount tax finalAmount status paymentStatus paidAmount paymentMethod deliveryDate notes invoice createdAt')
        .populate('customer', 'name phone email address')
        .populate('items.product', 'name sku size bottlesPerCarton')
        .populate('createdBy', 'name email')
        .populate('assignedTo', 'name email')
        .populate({
          path: 'invoice',
          select: 'invoiceNumber status paidAmount balanceAmount totalAmount paymentHistory',
          populate: {
            path: 'paymentHistory.recordedBy',
            select: 'name'
          }
        })
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)
        .lean(), // Use lean() for better performance
      Order.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalOrders / limit);

    logger.info(`Fetched ${orders.length} orders`, { userId: authUser.userId, page, limit, totalOrders });

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
    logger.error('Get orders error', error, { userId: authUser?.userId });
    return errorResponse(error, 'Failed to fetch orders');
  }
}

// POST create new order
export async function POST(request) {
  try {
    const authUser = await getAuthUser();

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
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
