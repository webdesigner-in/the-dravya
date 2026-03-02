import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';

// GET single invoice
export async function GET(request, { params }) {
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
    console.error('Get invoice error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// PUT update invoice (admin only)
export async function PUT(request, { params }) {
  try {
    const authUser = await getAuthUser();

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
    console.error('Update invoice error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// DELETE invoice (admin only)
export async function DELETE(request, { params }) {
  try {
    const authUser = await getAuthUser();

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
    console.error('Delete invoice error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
