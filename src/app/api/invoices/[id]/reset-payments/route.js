import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Order from '@/models/Order';
import Transaction from '@/models/Transaction';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';
import { generateTransactionNumber } from '@/lib/numberGenerator';

// POST reset all payments on invoice
export async function POST(request, { params }) {
  let authUser;
  try {
    authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access only' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;

    // Get invoice with order
    const invoice = await Invoice.findById(id).populate('order');

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if there are any payments to reset
    if (!invoice.paymentHistory || invoice.paymentHistory.length === 0) {
      return NextResponse.json(
        { error: 'No payments to reset' },
        { status: 400 }
      );
    }

    // Store count before reset
    const previousPaymentCount = invoice.paymentHistory.length;

    // Capture total paid amount before reset for the reversal transaction
    const totalPaidBeforeReset = invoice.paidAmount;

    // Reset invoice payment amounts
    invoice.paidAmount = 0;
    invoice.balanceAmount = invoice.totalAmount;
    invoice.status = 'sent'; // Mark as sent (unpaid)
    
    // Keep payment history for audit purposes but add a reset note
    invoice.paymentHistory.push({
      amount: 0,
      paymentMethod: 'cash', // Use valid enum value
      date: new Date(),
      notes: `RESET: All payments voided by ${authUser.name || authUser.email}. Previous ${previousPaymentCount} payment(s) reset to unpaid.`,
      recordedBy: authUser.userId,
    });

    // Set due date if not exists (7 days from now)
    if (!invoice.dueDate) {
      invoice.dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    await invoice.save();

    // Update order payment status
    const order = invoice.order;
    order.paidAmount = 0;
    order.paymentStatus = 'unpaid';
    
    await order.save();

    // Note: We keep transactions in the system for audit purposes
    // They represent historical records of what happened

    // Create a reversal Transaction record for the audit trail
    if (totalPaidBeforeReset > 0) {
      const invoiceNumber = invoice.invoiceNumber;
      const orderRef = invoice.order;
      await Transaction.create({
        transactionNumber: generateTransactionNumber(),
        type: 'income',
        category: 'sale',
        amount: totalPaidBeforeReset,
        paymentMethod: 'cash',
        paymentStatus: 'refunded',
        order: orderRef._id || orderRef,
        customer: invoice.customer || undefined,
        description: `Payment reversal for invoice ${invoiceNumber}`,
        notes: `REVERSAL: ${previousPaymentCount} payment(s) totalling ${totalPaidBeforeReset} voided by ${authUser.name || authUser.email}`,
        date: new Date(),
        createdBy: authUser.userId,
      });
    }

    // Populate and return updated invoice
    const updatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer', 'name phone email')
      .populate('order', 'orderNumber')
      .populate('paymentHistory.recordedBy', 'name');

    return NextResponse.json(
      {
        success: true,
        message: 'All payments reset successfully. Invoice marked as unpaid.',
        invoice: updatedInvoice,
      },
      { status: 200 }
    );
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to reset payments');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
