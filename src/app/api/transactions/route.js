import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import Customer from '@/models/Customer';
import Order from '@/models/Order';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { generateTransactionNumber } from '@/lib/numberGenerator';

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
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;

    const filter = {};
    if (type) filter.type = type;
    if (category) filter.category = category;

    // Date filters
    if (dateFilter) {
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

    const transactions = await Transaction.find(filter)
      .populate('customer', 'name phone')
      .populate('order', 'orderNumber orderType guestInfo')
      .populate('createdBy', 'name')
      .sort({ date: -1 });

    // Apply search filter (after population)
    let filteredTransactions = transactions;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredTransactions = transactions.filter((transaction) => {
        return (
          transaction.description?.toLowerCase().includes(searchLower) ||
          transaction.reference?.toLowerCase().includes(searchLower) ||
          transaction.transactionNumber?.toLowerCase().includes(searchLower) ||
          transaction.customer?.name?.toLowerCase().includes(searchLower) ||
          transaction.order?.orderNumber?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Calculate totals from filtered transactions
    const totalIncome = filteredTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate pagination
    const totalTransactions = filteredTransactions.length;
    const totalPages = Math.ceil(totalTransactions / limit);
    const skip = (page - 1) * limit;
    const paginatedTransactions = filteredTransactions.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      transactions: paginatedTransactions,
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
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
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
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
