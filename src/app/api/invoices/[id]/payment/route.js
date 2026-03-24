import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Order from '@/models/Order';
import Transaction from '@/models/Transaction';
import { getAuthUser } from '@/lib/auth';
import { generateTransactionNumber } from '@/lib/numberGenerator';
import { handleApiError } from '@/lib/errorHandler';

// POST record payment on invoice
export async function POST(request, { params }) {
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

    const { id } = await params;
    const body = await request.json();
    const { amount, paymentMethod, notes } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Please provide a valid payment amount' },
        { status: 400 }
      );
    }

    const paymentAmount = parseFloat(amount);

    // Atomic balance check + deduction — eliminates the read-check-write race
    // condition where two concurrent payments both pass the balance check.
    // findOneAndUpdate only succeeds if balanceAmount >= paymentAmount AND the
    // invoice is not already fully paid.
    const invoice = await Invoice.findOneAndUpdate(
      {
        _id: id,
        status: { $ne: 'paid' },
        balanceAmount: { $gte: paymentAmount },
      },
      {
        $inc: { paidAmount: paymentAmount, balanceAmount: -paymentAmount },
      },
      { returnDocument: 'after' }
    ).populate('order');

    if (!invoice) {
      // Distinguish between "not found", "already paid", and "exceeds balance"
      const existing = await Invoice.findById(id).select('status balanceAmount').lean();
      if (!existing) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      if (existing.status === 'paid' || existing.balanceAmount <= 0) {
        return NextResponse.json({ error: 'Invoice is already fully paid' }, { status: 400 });
      }
      return NextResponse.json(
        { error: `Payment amount (₹${paymentAmount}) exceeds balance due (₹${existing.balanceAmount})` },
        { status: 400 }
      );
    }

    // Balance deducted atomically above. Now do the non-critical follow-up writes.
    const newPaidAmount    = invoice.paidAmount;     // already updated by findOneAndUpdate
    const newBalanceAmount = invoice.balanceAmount;  // already updated

    let newStatus = newBalanceAmount <= 0 ? 'paid' : 'partial';

    // Create transaction record
    const transactionNumber = generateTransactionNumber();
    const transactionData = {
      transactionNumber,
      type: 'income',
      category: 'sale',
      amount: paymentAmount,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: 'completed',
      order: invoice.order._id,
      description: `Payment received for invoice ${invoice.invoiceNumber} (Order: ${invoice.order.orderNumber})`,
      reference: invoice.invoiceNumber,
      date: new Date(),
      notes: notes || `Payment ${invoice.paymentHistory.length + 1}`,
      createdBy: authUser.userId,
    };
    if (invoice.customer) transactionData.customer = invoice.customer;

    const transaction = await Transaction.create(transactionData);

    // Persist status, payment history, and optional dueDate clear
    invoice.status = newStatus;
    invoice.paymentHistory.push({
      amount: paymentAmount,
      paymentMethod: paymentMethod || 'cash',
      transactionId: transaction._id,
      date: new Date(),
      notes: notes || '',
      recordedBy: authUser.userId,
    });
    if (newStatus === 'paid') invoice.dueDate = null;
    await invoice.save();

    // Update order payment status
    const order = invoice.order;
    order.paidAmount = newPaidAmount;
    order.paymentStatus = newPaidAmount >= order.finalAmount
      ? 'paid'
      : newPaidAmount > 0 ? 'partial' : 'unpaid';
    await order.save();

    // Populate and return updated invoice
    const updatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer', 'name phone email')
      .populate('order', 'orderNumber')
      .populate('paymentHistory.recordedBy', 'name')
      .populate('paymentHistory.transactionId', 'transactionNumber');

    return NextResponse.json(
      {
        success: true,
        message: `Payment of ₹${paymentAmount.toFixed(2)} recorded successfully`,
        invoice: updatedInvoice,
        transaction,
      },
      { status: 200 }
    );
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to record payment');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
