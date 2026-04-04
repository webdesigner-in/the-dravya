import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

export async function GET(request, { params }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const invoice = await Invoice.findById(id)
      .populate('customer', 'name phone email address')
      .populate('order', 'orderNumber orderType guestInfo')
      .populate('items.product', 'name sku price')
      .populate('createdBy', 'name email');

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch invoice');
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
      return NextResponse.json({ error: 'Forbidden - Admin access only' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    const { status, dueDate, paymentTerms, notes, terms } = await request.json();

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (status)              invoice.status       = status;
    if (dueDate)             invoice.dueDate      = dueDate;
    if (paymentTerms)        invoice.paymentTerms = paymentTerms;
    if (notes !== undefined) invoice.notes        = notes;
    if (terms !== undefined) invoice.terms        = terms;

    await invoice.save();

    const updatedInvoice = await Invoice.findById(id)
      .populate('customer', 'name phone email address')
      .populate('order', 'orderNumber')
      .populate('items.product', 'name sku price')
      .populate('createdBy', 'name email');

    return NextResponse.json({ success: true, invoice: updatedInvoice });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to update invoice');
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
      return NextResponse.json({ error: 'Forbidden - Admin access only' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    const invoice = await Invoice.findByIdAndDelete(id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to delete invoice');
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}
