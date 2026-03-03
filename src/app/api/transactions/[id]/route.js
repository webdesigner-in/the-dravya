import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import { getAuthUser } from '@/lib/auth';

// GET single transaction
export async function GET(request, { params }) {
  let authUser;
  try {
    const { id } = await params;
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

    const transaction = await Transaction.findById(id)
      .populate('customer', 'name phone')
      .populate('order', 'orderNumber')
      .populate('createdBy', 'name');

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      transaction,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// PUT update transaction
export async function PUT(request, { params }) {
  let authUser;
  try {
    const { id } = await params;
    authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can update transactions
    if (authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can update transactions.' },
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

    await connectDB();

    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData = {
      type,
      category,
      amount,
      paymentMethod,
      paymentStatus,
      description,
      reference,
      date,
      notes,
    };

    // Only add order and customer if they have valid values
    if (order && order.trim() !== '') {
      updateData.order = order;
    } else {
      updateData.order = null;
    }
    
    if (customer && customer.trim() !== '') {
      updateData.customer = customer;
    } else {
      updateData.customer = null;
    }

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      updateData,
      { returnDocument: 'after', runValidators: true }
    )
      .populate('customer', 'name phone')
      .populate('order', 'orderNumber')
      .populate('createdBy', 'name');

    return NextResponse.json({
      success: true,
      transaction: updatedTransaction,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// DELETE transaction
export async function DELETE(request, { params }) {
  let authUser;
  try {
    const { id } = await params;
    authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can delete transactions
    if (authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can delete transactions.' },
        { status: 403 }
      );
    }

    await connectDB();

    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    await Transaction.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
