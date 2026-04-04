import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
import { getAuthUser } from '@/lib/auth';
import { generateOrderNumber } from '@/lib/numberGenerator';
import { parsePagination } from '@/lib/apiHelpers';
import { createLogger } from '@/lib/logger';
import { QUERY_LIMITS, QUERY_TIMEOUTS } from '@/lib/constants';
import { escapeRegex } from '@/lib/sanitize';
import { appendOrdersDatePresetFilter } from '@/lib/orderDateRangeFilter';

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
    const sortBy = searchParams.get('sortBy') || 'date';
    const datePreset = searchParams.get('date');
    const { page, limit, skip } = parsePagination(searchParams);

    // Build simple filter
    const filter = authUser.role === 'admin' ? {} : { createdBy: authUser.userId };

    // Add simple filters - handle "null" string and guest orders for customer filter
    if (customerId) {
      if (customerId === 'null' || customerId === 'undefined') {
        // Show all guest orders
        filter.orderType = 'guest';
      } else if (/^[0-9a-f]{24}$/i.test(customerId)) {
        // Valid 24-char ObjectId — the ledger passes guest order's own _id,
        // and regular customer's _id. We need to distinguish them.
        // We do this by checking orderType after the query using $or:
        // match either customer = id OR (_id = id AND orderType = guest)
        const mongoose = await import('mongoose');
        const oid = new mongoose.default.Types.ObjectId(customerId);
        filter.$or = [
          { customer: oid },
          { _id: oid, orderType: 'guest' },
        ];
      } else {
        // Non-ObjectId string — treat as customer field (shouldn't normally happen)
        filter.customer = customerId;
      }
    }
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    // Enhanced search - search by order number OR customer name
    if (search && search.trim()) {
      try {
        const safe = escapeRegex(search.trim());
        const matchingCustomers = await Customer.find({
          $or: [
            { name: { $regex: safe, $options: 'i' } },
            { phone: { $regex: safe, $options: 'i' } }
          ]
        })
        .select('_id')
        .limit(QUERY_LIMITS.SEARCH_RESULTS)
        .lean()
        .maxTimeMS(QUERY_TIMEOUTS.FAST);
        
        const customerIds = matchingCustomers.map(c => c._id);
        
        const searchOr = customerIds.length > 0
          ? [
              { orderNumber: { $regex: `^${safe}`, $options: 'i' } },
              { customer: { $in: customerIds } },
              { 'guestInfo.name':  { $regex: safe, $options: 'i' } },
              { 'guestInfo.phone': { $regex: safe, $options: 'i' } },
            ]
          : [
              { orderNumber: { $regex: `^${safe}`, $options: 'i' } },
              { 'guestInfo.name':  { $regex: safe, $options: 'i' } },
              { 'guestInfo.phone': { $regex: safe, $options: 'i' } },
            ];

        if (filter.$or) {
          filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
          delete filter.$or;
        } else {
          filter.$or = searchOr;
        }
      } catch (searchError) {
        logger.error('Customer search error', searchError);
        filter.orderNumber = { $regex: `^${escapeRegex(search.trim())}`, $options: 'i' };
      }
    }

    appendOrdersDatePresetFilter(filter, datePreset);

    const orderListSelect =
      'orderNumber orderType customer guestInfo items totalAmount finalAmount status paymentStatus paidAmount deliveryDate createdAt invoice';

    const ordersQuery =
      sortBy === 'orderNumber'
        ? Order.find(filter)
            .select(orderListSelect)
            .populate('customer', 'name phone')
            .populate('items.product', 'name')
            .populate('invoice', 'invoiceNumber status balanceAmount paidAmount paymentHistory')
            .sort({ orderNumber: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
            .maxTimeMS(QUERY_TIMEOUTS.COMPLEX)
        : (async () => {
            // Sort by delivery date descending — later dates first (e.g. March above January).
            // Not by createdAt. Missing deliveryDate falls back to createdAt for sorting.
            const pipeline = [
              { $match: filter },
              {
                $addFields: {
                  _sortDelivery: { $ifNull: ['$deliveryDate', '$createdAt'] },
                },
              },
              { $sort: { _sortDelivery: -1, createdAt: -1 } },
              { $skip: skip },
              { $limit: limit },
              { $project: { _sortDelivery: 0 } },
            ];
            const raw = await Order.aggregate(pipeline).option({
              maxTimeMS: QUERY_TIMEOUTS.COMPLEX,
            });
            return Order.populate(raw, [
              { path: 'customer', select: 'name phone' },
              { path: 'items.product', select: 'name' },
              {
                path: 'invoice',
                select:
                  'invoiceNumber status balanceAmount paidAmount paymentHistory',
              },
            ]);
          })();

    const [orders, totalOrders] = await Promise.all([
      ordersQuery,
      Order.countDocuments(filter).maxTimeMS(QUERY_TIMEOUTS.NORMAL),
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
    logger.error('Get orders error', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch orders',
        ...(process.env.NODE_ENV !== 'production' && { message: error.message }),
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

    // Phase 1: Read-only product validation — no writes yet
    let subtotalAtOriginalPrice = 0;
    let subtotalAtCustomPrice = 0;
    const validatedItems = [];
    const productInfoMap = {}; // keyed by string(id) for rollback error messages

    for (const item of items) {
      const product = await Product.findById(item.product).select('name price').lean();
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.product}` },
          { status: 404 }
        );
      }

      // Validate quantity is a positive integer
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return NextResponse.json(
          { error: `Invalid quantity for product ${product.name}: must be a positive integer` },
          { status: 400 }
        );
      }

      productInfoMap[String(item.product)] = product;

      const originalPrice = parseFloat(product.price);
      const itemPrice = item.customPrice ? parseFloat(item.customPrice) : originalPrice;
      const customSubtotal = item.quantity * itemPrice;
      subtotalAtOriginalPrice += item.quantity * originalPrice;
      subtotalAtCustomPrice  += customSubtotal;

      const discountPercentage = originalPrice > itemPrice
        ? Math.round(((originalPrice - itemPrice) / originalPrice) * 100)
        : 0;

      validatedItems.push({
        product:            product._id,
        quantity:           item.quantity,
        price:              itemPrice,
        originalPrice,
        discountPercentage,
        subtotal:           customSubtotal,
      });
    }

    // Calculate discount as difference between original and custom pricing
    const calculatedDiscount = subtotalAtOriginalPrice - subtotalAtCustomPrice;
    const discountAmount = calculatedDiscount > 0 ? calculatedDiscount : (parseFloat(discount) || 0);
    const taxAmount = parseFloat(tax) || 0;
    
    // Total amount is at original prices, final amount is after discount and tax
    const totalAmount = subtotalAtOriginalPrice;
    const finalAmount = subtotalAtCustomPrice + taxAmount;

    // Credit limit check — must happen after finalAmount is known
    // Calculate real outstanding from DB, not the stale field on the customer doc
    if (!isGuestOrder && customerDoc) {
      const creditLimit = parseFloat(customerDoc.creditLimit) || 0;
      if (creditLimit > 0) {
        const outstandingAgg = await Order.aggregate([
          { $match: { customer: customerDoc._id, status: 'delivered' } },
          { $group: { _id: null, total: { $sum: { $subtract: ['$finalAmount', '$paidAmount'] } } } },
        ]);
        const currentOutstanding = outstandingAgg[0]?.total || 0;
        if (currentOutstanding + finalAmount > creditLimit) {
          const availableCredit = Math.max(0, creditLimit - currentOutstanding);
          return NextResponse.json(
            {
              error: 'Credit limit exceeded',
              details: {
                creditLimit: creditLimit.toFixed(2),
                currentOutstanding: currentOutstanding.toFixed(2),
                orderAmount: finalAmount.toFixed(2),
                availableCredit: availableCredit.toFixed(2),
              },
            },
            { status: 400 }
          );
        }
      }
    }

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

    // Phase 2: Atomically deduct stock for every item, then create the order.
    // Using findOneAndUpdate with a $gte condition eliminates the read-check-write
    // race condition: only one concurrent request can win the stock slot.
    const deducted = []; // track successful deductions for rollback if Order.create fails

    for (const vi of validatedItems) {
      const updated = await Product.findOneAndUpdate(
        { _id: vi.product, stock: { $gte: vi.quantity } },
        { $inc: { stock: -vi.quantity } },
        { returnDocument: 'after' }
      );

      if (!updated) {
        // Rollback all deductions that already succeeded
        if (deducted.length > 0) {
          await Product.bulkWrite(
            deducted.map(d => ({
              updateOne: {
                filter: { _id: d.productId },
                update: { $inc: { stock: d.quantity } },
              },
            }))
          ).catch(rbErr => logger.error('Stock rollback failed', rbErr));
        }
        const info    = productInfoMap[String(vi.product)];
        const current = await Product.findById(vi.product).select('stock').lean();
        return NextResponse.json(
          { error: `Insufficient stock for ${info?.name || 'product'}. Available: ${current?.stock ?? 0}` },
          { status: 400 }
        );
      }

      deducted.push({ productId: vi.product, quantity: vi.quantity });
    }

    // Create the order; if this fails, restore all deducted stock
    let order;
    try {
      order = await Order.create(orderData);
    } catch (createError) {
      await Product.bulkWrite(
        deducted.map(d => ({
          updateOne: {
            filter: { _id: d.productId },
            update: { $inc: { stock: d.quantity } },
          },
        }))
      ).catch(rbErr => logger.error('Stock rollback failed', rbErr));
      throw createError;
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name phone email address')
      .populate('items.product', 'name sku size bottlesPerCarton')
      .populate('createdBy', 'name email');

    return NextResponse.json(
      { success: true, order: populatedOrder },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Create order error', error);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV !== 'production' ? error.message : 'Failed to create order',
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
