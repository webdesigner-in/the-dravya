import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Transaction from '@/models/Transaction';
import Order from '@/models/Order';
import Customer from '@/models/Customer';
import { getAuthUser } from '@/lib/auth';

// POST record payment for invoice
export async function POST(request, { params }) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { amount, paymentMethod, notes } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Please provide a valid payment amount' },
        { status: 400 }
      );
    }

    // Get invoice
    const invoice = await Invoice.findById(id)
      .populate('order', 'orderNumber paymentMethod')
      .populate('customer', 'name');

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Calculate new paid amount
    const newPaidAmount = invoice.paidAmount + parseFloat(amount);
    const newBalanceAmount = invoice.totalAmount - newPaidAmount;

    // Determine new status
    let newStatus = invoice.status;
    if (newPaidAmount >= invoice.totalAmount) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    }

    // Update invoice
    invoice.paidAmount = newPaidAmount;
    invoice.balanceAmount = newBalanceAmount;
    invoice.status = newStatus;
    await invoice.save();

    // Create transaction
    const transactionCount = await Transaction.countDocuments();
    const transactionNumber = `TXN${String(transactionCount + 1).padStart(6, '0')}`;

    await Transaction.create({
      transactionNumber,
      type: 'income',
      category: 'sale',
      amount: parseFloat(amount),
      paymentMethod: paymentMethod || invoice.order?.paymentMethod || 'cash',
      paymentStatus: 'completed',
      order: invoice.order?._id,
      customer: invoice.customer._id,
      description: `Payment received for invoice ${invoice.invoiceNumber}${invoice.order ? ` (Order: ${invoice.order.orderNumber})` : ''}`,
      reference: invoice.invoiceNumber,
      date: new Date(),
      notes: notes || (newStatus === 'paid' ? 'Full payment completed' : `Partial payment - Balance: ₹${newBalanceAmount.toFixed(2)}`),
      createdBy: authUser.userId,
    });

    const updatedInvoice = await Invoice.findById(id)
      .populate('customer', 'name phone email address')
      .populate('order', 'orderNumber');

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: 'Payment recorded successfully',
    });
  } catch (error) {
    console.error('Record payment error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
