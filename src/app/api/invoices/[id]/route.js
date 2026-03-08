import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';
import { retryOperation, delay } from '@/lib/retryHelper';

// GET single invoice
export async function GET(request, { params }) {
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

    const invoice = await Invoice.findById(id)
      .populate('customer', 'name phone email address')
      .populate('order', 'orderNumber orderType guestInfo')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name email');

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch invoice');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}

// PUT update invoice (admin only)
export async function PUT(request, { params }) {
  let authUser;
  try {
    authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can edit invoices
    if (authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access only' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      status,
      paidAmount,
      dueDate,
      paymentTerms,
      notes,
      terms,
    } = body;

    await connectDB();

    const { id } = await params;

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Update invoice with retry logic
    await retryOperation(async () => {
      // Update fields
      if (status) invoice.status = status;
      if (paidAmount !== undefined) {
        invoice.paidAmount = parseFloat(paidAmount);
        invoice.balanceAmount = invoice.totalAmount - invoice.paidAmount;
        
        // Auto-update status based on payment
        if (invoice.paidAmount >= invoice.totalAmount) {
          invoice.status = 'paid';
        } else if (invoice.paidAmount > 0) {
          invoice.status = 'partial';
        }
      }
      if (dueDate) invoice.dueDate = dueDate;
      if (paymentTerms) invoice.paymentTerms = paymentTerms;
      if (notes !== undefined) invoice.notes = notes;
      if (terms !== undefined) invoice.terms = terms;

      await invoice.save();

      // Update order payment status if needed
      if (paidAmount !== undefined) {
        const order = await Order.findById(invoice.order);
        if (order) {
          order.paidAmount = invoice.paidAmount;
          if (invoice.paidAmount >= invoice.totalAmount) {
            order.paymentStatus = 'paid';
          } else if (invoice.paidAmount > 0) {
            order.paymentStatus = 'partial';
          } else {
            order.paymentStatus = 'unpaid';
          }
          await order.save();
        }
      }
    }, 3, 500);

    // Add small delay to ensure database consistency
    await delay(300);

    const updatedInvoice = await Invoice.findById(id)
      .populate('customer', 'name phone email address')
      .populate('order', 'orderNumber')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name email');

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to update invoice');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}

// DELETE invoice (admin only)
export async function DELETE(request, { params }) {
  let authUser;
  try {
    authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can delete invoices
    if (authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access only' },
        { status: 403 }
      );
    }

    await connectDB();

    const { id } = await params;

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Delete the invoice
    await Invoice.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to delete invoice');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
