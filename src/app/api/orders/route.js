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

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer');
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const search = searchParams.get('search');
    const { page, limit, skip } = parsePagination(searchParams);

    // Build simple filter
    const filter = authUser.role === 'admin' ? {} : { createdBy: authUser.userId };

    // Add simple filters
    if (customerId) filter.customer = customerId;
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    // Enhanced search - search by order number OR customer name
    if (search && search.trim()) {
      try {
        // Find customers matching the search (with limit to prevent slowdown)
        const matchingCustomers = await Customer.find({
          $or: [
            { name: { $regex: search.trim(), $options: 'i' } },
            { phone: { $regex: search.trim(), $options: 'i' } }
          ]
        })
        .select('_id')
        .limit(50)
        .lean()
        .maxTimeMS(3000);
        
        const customerIds = matchingCustomers.map(c => c._id);
        
        // Build search filter
        if (customerIds.length > 0) {
          filter.$or = [
            { orderNumber: { $regex: search.trim(), $options: 'i' } },
            { customer: { $in: customerIds } },
            { 'guestInfo.name': { $regex: search.trim(), $options: 'i' } },
            { 'guestInfo.phone': { $regex: search.trim(), $options: 'i' } }
          ];
        } else {
          // No customers found, search only order number and guest info
          filter.$or = [
            { orderNumber: { $regex: search.trim(), $options: 'i' } },
            { 'guestInfo.name': { $regex: search.trim(), $options: 'i' } },
            { 'guestInfo.phone': { $regex: search.trim(), $options: 'i' } }
          ];
        }
      } catch (searchError) {
        console.error('Customer search error:', searchError);
        // Fallback to simple order number search if customer search fails
        filter.orderNumber = { $regex: search.trim(), $options: 'i' };
      }
    }

    // Simple query - no complex $or/$and
    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .select('orderNumber orderType customer guestInfo items totalAmount finalAmount status paymentStatus paidAmount deliveryDate createdAt invoice')
        .populate('customer', 'name phone')
        .populate('items.product', 'name')
        .populate('invoice', 'invoiceNumber status balanceAmount paidAmount paymentHistory')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .maxTimeMS(20000),
      Order.countDocuments(filter).maxTimeMS(5000)
    ]);

    const totalPages = Math.ceil(totalOrders / limit);

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
    });
  } catch (error) {
    console.error('Orders API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch orders',
        message: error.message,
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
