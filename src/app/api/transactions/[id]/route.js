import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

export async function GET(request, { params }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Only administrators can view transactions.' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    const transaction = await Transaction.findById(id)
      .populate('customer', 'name phone')
      .populate('order', 'orderNumber')
      .populate('createdBy', 'name');

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch transaction');
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}

export async function PUT(request, { params }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Only admins can update transactions.' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    const { type, category, amount, paymentMethod, paymentStatus, order, customer, description, reference, date, notes } = await request.json();

    const updateData = { type, category, amount, paymentMethod, paymentStatus, description, reference, date, notes };
    updateData.order    = order    && order.trim()    !== '' ? order    : null;
    updateData.customer = customer && customer.trim() !== '' ? customer : null;

    const transaction = await Transaction.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('customer', 'name phone')
      .populate('order', 'orderNumber')
      .populate('createdBy', 'name');

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to update transaction');
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Only admins can delete transactions.' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    const transaction = await Transaction.findByIdAndDelete(id);
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to delete transaction');
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}
