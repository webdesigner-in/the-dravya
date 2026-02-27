import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Invoice from '@/models/Invoice';
import Transaction from '@/models/Transaction';
import { getAuthUser } from '@/lib/auth';
import { generateInvoiceNumber, generateTransactionNumber } from '@/lib/numberGenerator';

// POST create invoice from order
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
    const { dueDate, paymentTerms, paymentStatus, paidAmount, notes, terms } = body;

    // Get order
    const order = await Order.findById(id).populate('items.product', 'name sku price');

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if invoice already exists for this order
    const existingInvoice = await Invoice.findOne({ order: id });
    if (existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice already exists for this order' },
        { status: 400 }
      );
    }

    // Create invoice items from order items with ORIGINAL prices
    const invoiceItems = order.items.map((item) => ({
      product: item.product._id,
      description: item.product.name,
      quantity: item.quantity,
      price: item.product.price, // Use original product price, not custom price
      subtotal: item.quantity * item.product.price, // Calculate subtotal at original price
    }));

    // Calculate subtotal from invoice items (at original prices)
    const calculatedSubtotal = invoiceItems.reduce((sum, item) => sum + item.subtotal, 0);

    // Calculate payment amounts (must be before using 'paid' variable)
    const paid = parseFloat(paidAmount) || 0;
    const balance = order.finalAmount - paid;

    // Calculate due date - only for unpaid/partial invoices
    let invoiceDueDate;
    if (paymentStatus === 'paid' || paid >= order.finalAmount) {
      // No due date for fully paid invoices
      invoiceDueDate = null;
    } else if (dueDate) {
      // Use provided due date
      invoiceDueDate = new Date(dueDate);
    } else {
      // Default 7 days from now for unpaid/partial
      invoiceDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    
    // Determine invoice status based on payment
    let invoiceStatus = 'sent';
    if (paymentStatus === 'paid' || paid >= order.finalAmount) {
      invoiceStatus = 'paid';
    } else if (paymentStatus === 'partial' || paid > 0) {
      invoiceStatus = 'partial';
    }

    // Generate unique invoice number using utility function
    const invoiceNumber = await generateInvoiceNumber();

    // Prepare invoice data
    const invoiceData = {
      invoiceNumber,
      order: order._id,
      customer: order.customer,
      items: invoiceItems,
      subtotal: calculatedSubtotal,
      discount: order.discount || 0,
      tax: order.tax || 0,
      totalAmount: order.finalAmount,
      paidAmount: paid,
      balanceAmount: balance,
      status: invoiceStatus,
      issueDate: new Date(),
      paymentTerms: paymentTerms || 'Due on receipt',
      createdBy: authUser.userId,
    };

    // Only add dueDate if it's not null
    if (invoiceDueDate !== null) {
      invoiceData.dueDate = invoiceDueDate;
    }

    // Add optional fields if provided
    if (notes) invoiceData.notes = notes;
    if (terms) invoiceData.terms = terms;

    const invoice = await Invoice.create(invoiceData);

    // Create transaction if payment is made
    if (paid > 0) {
      const transactionNumber = await generateTransactionNumber();

      await Transaction.create({
        transactionNumber,
        type: 'income',
        category: 'sale',
        amount: paid,
        paymentMethod: order.paymentMethod || 'cash',
        paymentStatus: 'completed',
        order: order._id,
        customer: order.customer,
        description: `Payment received for invoice ${invoiceNumber} (Order: ${order.orderNumber})`,
        reference: invoiceNumber,
        date: new Date(),
        notes: paymentStatus === 'partial' ? `Partial payment of ₹${paid} out of ₹${order.finalAmount}` : 'Full payment received',
        createdBy: authUser.userId,
      });
    }

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer', 'name phone email address')
      .populate('order', 'orderNumber')
      .populate('items.product', 'name sku');

    return NextResponse.json(
      {
        success: true,
        invoice: populatedInvoice,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create invoice error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
