import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import Customer from '@/models/Customer';
import Order from '@/models/Order';
import { getAuthUser } from '@/lib/auth';
import { generateTransactionNumber } from '@/lib/numberGenerator';
import { handleApiError } from '@/lib/errorHandler';
import { QUERY_LIMITS, QUERY_TIMEOUTS } from '@/lib/constants';
import { escapeRegex } from '@/lib/sanitize';

// GET all transactions
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

    // Only admins can view transactions
    if (authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Only administrators can view transactions.' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const dateFilter = searchParams.get('date');
    const month = searchParams.get('month'); // Format: "YYYY-MM" or "all"
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || QUERY_LIMITS.DEFAULT_PAGE_SIZE;

    const filter = {};
    if (type) filter.type = type;
    if (category) filter.category = category;

    // Month filter takes precedence over date filter
    if (month && month !== 'all') {
      const [year, monthNum] = month.split('-');
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);
      
      filter.date = {
        $gte: startDate,
        $lte: endDate
      };
    } else if (dateFilter) {
      // Date filters (only if month filter is not set)
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
        filter.date = { $gte: startDate };
      }
    }

    // Build DB-level search filter so we never fetch the full collection into memory.
    // Searching populated fields (customer.name, order.orderNumber) requires a
    // pre-lookup of matching IDs — same pattern used by the orders endpoint.
    if (search && search.trim()) {
      const s = escapeRegex(search.trim());
      const [matchingCustomers, matchingOrders] = await Promise.all([
        Customer.find({ name: { $regex: s, $options: 'i' } })
          .select('_id').lean().limit(QUERY_LIMITS.SEARCH_RESULTS).maxTimeMS(QUERY_TIMEOUTS.FAST),
        Order.find({ orderNumber: { $regex: `^${s}`, $options: 'i' } })
          .select('_id').lean().limit(QUERY_LIMITS.SEARCH_RESULTS).maxTimeMS(QUERY_TIMEOUTS.FAST),
      ]);
      const orClauses = [
        { transactionNumber: { $regex: s, $options: 'i' } },
        { description:       { $regex: s, $options: 'i' } },
        { reference:         { $regex: s, $options: 'i' } },
      ];
      if (matchingCustomers.length) orClauses.push({ customer: { $in: matchingCustomers.map(c => c._id) } });
      if (matchingOrders.length)   orClauses.push({ order:    { $in: matchingOrders.map(o => o._id) } });
      filter.$or = orClauses;
    }

    const skip = (page - 1) * limit;

    // Build a date-only filter for summary calculations (ignore type/category/search filters)
    const summaryDateFilter = {};
    if (month && month !== 'all') {
      const [yr, mo] = month.split('-');
      summaryDateFilter.date = {
        $gte: new Date(parseInt(yr), parseInt(mo) - 1, 1),
        $lte: new Date(parseInt(yr), parseInt(mo), 0, 23, 59, 59, 999),
      };
    }

    // Run paginated fetch + totals in parallel
    // Income = completed income transactions minus refunded reversals (net cash received)
    // Expense = expense transactions in the date range
    // Both use only the date filter — not affected by type/category/search filters
    const [transactions, totalTransactions, summaryTotals] = await Promise.all([
      Transaction.find(filter)
        .populate('customer', 'name phone')
        .populate('order', 'orderNumber orderType guestInfo')
        .populate('createdBy', 'name')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .maxTimeMS(QUERY_TIMEOUTS.SLOW),
      Transaction.countDocuments(filter).maxTimeMS(QUERY_TIMEOUTS.NORMAL),
      Transaction.aggregate([
        { $match: { ...summaryDateFilter } },
        {
          $group: {
            _id: '$type',
            completed: {
              $sum: {
                $cond: [{ $ne: ['$paymentStatus', 'refunded'] }, '$amount', 0]
              }
            },
            refunded: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'refunded'] }, '$amount', 0]
              }
            },
          },
        },
      ]).option({ maxTimeMS: QUERY_TIMEOUTS.NORMAL }),
    ]);

    const incomeRow  = summaryTotals.find(t => t._id === 'income');
    const expenseRow = summaryTotals.find(t => t._id === 'expense');
    // Net income = completed income - refunded reversals
    const totalIncome  = (incomeRow?.completed ?? 0) - (incomeRow?.refunded ?? 0);
    const totalExpense = expenseRow?.completed ?? 0;
    const totalPages   = Math.ceil(totalTransactions / limit);

    return NextResponse.json({
      success: true,
      transactions,
      summary: {
        totalIncome,
        totalExpense,
        netProfit: totalIncome - totalExpense,
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalTransactions,
        itemsPerPage: limit,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch transactions');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}

// POST create transaction
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

    // Only admins can create transactions
    if (authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Only administrators can create transactions.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      type,
      category,
      amount,
      paymentMethod,
      paymentStatus,
      order,
      customer,
      description,
      reference,
      date,
      notes,
    } = body;

    if (!type || !category || !amount || !paymentMethod || !description) {
      return NextResponse.json(
        { error: 'Please provide all required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    // Generate unique transaction number using utility function
    const transactionNumber = generateTransactionNumber();

    // Prepare transaction data - convert empty strings to null for ObjectId fields
    const transactionData = {
      transactionNumber,
      type,
      category,
      amount,
      paymentMethod,
      paymentStatus: paymentStatus || 'completed',
      description,
      reference,
      date: date || new Date(),
      notes,
      createdBy: authUser.userId,
    };

    // Only add order and customer if they have valid values
    if (order && order.trim() !== '') {
      transactionData.order = order;
    }
    if (customer && customer.trim() !== '') {
      transactionData.customer = customer;
    }

    const transaction = await Transaction.create(transactionData);

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('customer', 'name phone')
      .populate('order', 'orderNumber')
      .populate('createdBy', 'name');

    return NextResponse.json(
      {
        success: true,
        transaction: populatedTransaction,
      },
      { status: 201 }
    );
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to create transaction');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
