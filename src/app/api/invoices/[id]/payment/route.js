import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Order from '@/models/Order';
import Transaction from '@/models/Transaction';
import { getAuthUser } from '@/lib/auth';
import { generateTransactionNumber } from '@/lib/numberGenerator';

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

    // Get invoice with order
    const invoice = await Invoice.findById(id).populate('order');

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if already fully paid
    if (invoice.status === 'paid' && invoice.balanceAmount <= 0) {
      return NextResponse.json(
        { error: 'Invoice is already fully paid' },
        { status: 400 }
      );
    }

    // Validate payment amount doesn't exceed balance
    const paymentAmount = parseFloat(amount);
    if (paymentAmount > invoice.balanceAmount) {
      return NextResponse.json(
        { error: `Payment amount (₹${paymentAmount}) exceeds balance due (₹${invoice.balanceAmount})` },
        { status: 400 }
      );
    }

    // Create transaction for this payment
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

    // Add customer only if it exists (not for guest orders)
    if (invoice.customer) {
      transactionData.customer = invoice.customer;
    }

    const transaction = await Transaction.create(transactionData);

    // Update invoice
    const newPaidAmount = invoice.paidAmount + paymentAmount;
    const newBalanceAmount = invoice.totalAmount - newPaidAmount;

    // Determine new status
    let newStatus = 'partial';
    if (newBalanceAmount <= 0) {
      newStatus = 'paid';
    } else if (newPaidAmount === 0) {
      newStatus = 'sent';
    }

    // Add to payment history
    invoice.paymentHistory.push({
      amount: paymentAmount,
      paymentMethod: paymentMethod || 'cash',
      transactionId: transaction._id,
      date: new Date(),
      notes: notes || '',
      recordedBy: authUser.userId,
    });

    invoice.paidAmount = newPaidAmount;
    invoice.balanceAmount = newBalanceAmount;
    invoice.status = newStatus;

    // Clear due date if fully paid
    if (newStatus === 'paid') {
      invoice.dueDate = null;
    }

    await invoice.save();

    // Update order payment status
    const order = invoice.order;
    order.paidAmount = newPaidAmount;
    
    if (newPaidAmount >= order.finalAmount) {
      order.paymentStatus = 'paid';
    } else if (newPaidAmount > 0) {
      order.paymentStatus = 'partial';
    } else {
      order.paymentStatus = 'unpaid';
    }
    
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
    console.error('Record payment error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
