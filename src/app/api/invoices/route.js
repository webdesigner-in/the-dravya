import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Order from '@/models/Order';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';
import { QUERY_LIMITS, QUERY_TIMEOUTS } from '@/lib/constants';

export async function GET(request) {
  let authUser;
  try {
    authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const customerId   = searchParams.get('customer');
    const orderId      = searchParams.get('order');
    const status       = searchParams.get('status');
    const search       = searchParams.get('search');
    const page         = Math.max(1, parseInt(searchParams.get('page')) || 1);
    const limit        = Math.min(100, parseInt(searchParams.get('limit')) || 20);
    const skip         = (page - 1) * limit;

    const filter = {};

    // Non-admins only see invoices they created
    if (authUser.role !== 'admin') {
      filter.createdBy = authUser.userId;
    }

    if (customerId) filter.customer = customerId;
    if (orderId)    filter.order    = orderId;
    if (status && status !== 'all') filter.status = status;

    // DB-level search — no in-memory filtering
    if (search && search.trim()) {
      const s = search.trim();

      // Find matching customers and orders in parallel
      const [matchingCustomers, matchingOrders] = await Promise.all([
        (await import('@/models/Customer')).default
          .find({ $or: [{ name: { $regex: s, $options: 'i' } }, { phone: { $regex: s, $options: 'i' } }] })
          .select('_id').lean().limit(QUERY_LIMITS.SEARCH_RESULTS).maxTimeMS(QUERY_TIMEOUTS.FAST),
        Order.find({ orderNumber: { $regex: `^${s}`, $options: 'i' } })
          .select('_id').lean().limit(QUERY_LIMITS.SEARCH_RESULTS).maxTimeMS(QUERY_TIMEOUTS.FAST),
      ]);

      const searchClauses = [
        { invoiceNumber: { $regex: s, $options: 'i' } },
        { 'guestInfo.name': { $regex: s, $options: 'i' } },
        { 'guestInfo.phone': { $regex: s, $options: 'i' } },
      ];
      if (matchingCustomers.length) searchClauses.push({ customer: { $in: matchingCustomers.map(c => c._id) } });
      if (matchingOrders.length)    searchClauses.push({ order:    { $in: matchingOrders.map(o => o._id) } });

      // Merge with existing filter using $and so other filters still apply
      filter.$or = searchClauses;
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('customer', 'name phone email address')
        .populate('order', 'orderNumber orderType guestInfo')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .maxTimeMS(QUERY_TIMEOUTS.COMPLEX),
      Invoice.countDocuments(filter).maxTimeMS(QUERY_TIMEOUTS.NORMAL),
    ]);

    return NextResponse.json({
      success: true,
      invoices,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasMore: page < Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch invoices');
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}
