import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
import Transaction from '@/models/Transaction';
import { getAuthUser } from '@/lib/auth';

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
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;

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

    // Month filter (specific month in YYYY-MM format) - use deliveryDate or createdAt
    if (monthFilter && monthFilter !== 'all') {
      const [year, month] = monthFilter.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      
      // Match orders where deliveryDate OR createdAt is in the selected month
      filter.$or = [
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
        // Match orders where deliveryDate OR createdAt is after startDate
        filter.$or = [
          { deliveryDate: { $gte: startDate } },
          { deliveryDate: { $exists: false }, createdAt: { $gte: startDate } },
          { deliveryDate: null, createdAt: { $gte: startDate } }
        ];
      }
    }

    // Both admins and distributors can see all orders
    // No role-based filtering for orders

    // Determine sort order
    let sortOrder = {};
    if (sortBy === 'orderNumber') {
      sortOrder = { orderNumber: -1 }; // Sort by order number descending
    } else {
      sortOrder = { deliveryDate: -1, createdAt: -1 }; // Sort by delivery date first, then creation date
    }

    const orders = await Order.find(filter)
      .populate('customer', 'name phone email address')
      .populate('items.product', 'name sku size bottlesPerCarton')
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort(sortOrder);

    // Search filter (applied after population)
    let filteredOrders = orders;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredOrders = orders.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(searchLower) ||
          order.customer?.name.toLowerCase().includes(searchLower) ||
          order.customer?.phone.includes(search)
      );
    }

    // Calculate pagination
    const totalOrders = filteredOrders.length;
    const totalPages = Math.ceil(totalOrders / limit);
    const skip = (page - 1) * limit;
    const paginatedOrders = filteredOrders.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      orders: paginatedOrders,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalOrders,
        itemsPerPage: limit,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
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
      customer,
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

    if (!customer || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Please provide customer and order items' },
        { status: 400 }
      );
    }

    await connectDB();

    // Validate customer exists
    const customerDoc = await Customer.findById(customer);
    if (!customerDoc) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
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

    // Generate order number
    const orderCount = await Order.countDocuments();
    const orderNumber = `ORD${String(orderCount + 1).padStart(6, '0')}`;

    const order = await Order.create({
      orderNumber,
      customer,
      items: validatedItems,
      totalAmount,
      discount: discountAmount,
      tax: taxAmount,
      finalAmount,
      status: status || 'pending',
      paymentStatus: paymentStatus || 'unpaid',
      paidAmount: parseFloat(paidAmount) || 0,
      paymentMethod: paymentMethod || 'cash',
      deliveryAddress: deliveryAddress || customerDoc.address,
      deliveryDate,
      notes,
      createdBy: authUser.userId,
      assignedTo: authUser.userId,
    });

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
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
