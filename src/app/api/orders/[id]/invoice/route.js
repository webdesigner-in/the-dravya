import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Invoice from '@/models/Invoice';
import Transaction from '@/models/Transaction';
import { getAuthUser } from '@/lib/auth';
import { generateInvoiceNumber, generateTransactionNumber } from '@/lib/numberGenerator';
import { handleApiError } from '@/lib/errorHandler';

// POST create invoice from order
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

    // Create invoice items from order items with proper pricing data
    const invoiceItems = order.items.map((item) => {
      const originalPrice = item.originalPrice || item.product.price;
      const actualPrice = item.price;
      const discountPercentage = originalPrice > actualPrice ? 
        Math.round(((originalPrice - actualPrice) / originalPrice) * 100) : 0;

      return {
        product: item.product._id,
        description: item.product.name,
        quantity: item.quantity,
        price: actualPrice, // Use the actual price from order
        originalPrice: originalPrice, // Store original price for display
        discountPercentage: discountPercentage, // Calculate discount percentage
        subtotal: item.subtotal, // Use subtotal from order
      };
    });

    // Calculate subtotal from invoice items (using actual prices)
    const calculatedSubtotal = invoiceItems.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Calculate original subtotal for proper invoice display
    const originalSubtotal = invoiceItems.reduce((sum, item) => {
      const originalPrice = item.originalPrice || item.product.price;
      return sum + (originalPrice * item.quantity);
    }, 0);

    // Calculate payment amounts (must be before using 'paid' variable)
    const paid = parseFloat(paidAmount) || 0;
    if (paid < 0 || paid > order.finalAmount) {
      return NextResponse.json(
        { error: `Paid amount must be between ₹0 and ₹${order.finalAmount.toFixed(2)}` },
        { status: 400 }
      );
    }
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
    const invoiceNumber = generateInvoiceNumber();

    // Prepare invoice data
    const invoiceData = {
      invoiceNumber,
      order: order._id,
      items: invoiceItems,
      subtotal: calculatedSubtotal, // Sum of actual (discounted) item prices — matches item rows
      discount: order.discount || 0,
      tax: order.tax || 0,
      totalAmount: order.finalAmount, // Final amount after discounts and tax
      paidAmount: paid,
      balanceAmount: balance,
      status: invoiceStatus,
      issueDate: new Date(),
      paymentTerms: paymentTerms || 'Due on receipt',
      createdBy: authUser.userId,
    };

    // Add customer or guest info based on order type
    if (order.orderType === 'guest') {
      invoiceData.guestInfo = order.guestInfo;
    } else {
      invoiceData.customer = order.customer;
    }

    // Only add dueDate if it's not null
    if (invoiceDueDate !== null) {
      invoiceData.dueDate = invoiceDueDate;
    }

    // Add optional fields if provided
    if (notes) invoiceData.notes = notes;
    if (terms) invoiceData.terms = terms;

    const invoice = await Invoice.create(invoiceData);

    // Keep the linked order's financial state aligned with the newly created invoice.
    order.invoice = invoice._id;
    order.paidAmount = paid;
    order.paymentStatus =
      paid >= order.finalAmount ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
    await order.save();

    // Create transaction if payment is made
    if (paid > 0) {
      const transactionNumber = generateTransactionNumber();

      const transactionData = {
        transactionNumber,
        type: 'income',
        category: 'sale',
        amount: paid,
        paymentMethod: order.paymentMethod || 'cash',
        paymentStatus: 'completed',
        order: order._id,
        description: `Payment received for invoice ${invoiceNumber} (Order: ${order.orderNumber})`,
        reference: invoiceNumber,
        date: new Date(),
        notes: paymentStatus === 'partial' ? `Partial payment of ₹${paid} out of ₹${order.finalAmount}` : 'Full payment received',
        createdBy: authUser.userId,
      };

      // Add customer only for regular orders
      if (order.orderType !== 'guest' && order.customer) {
        transactionData.customer = order.customer;
      }

      await Transaction.create(transactionData);
    }

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer', 'name phone email address')
      .populate('order', 'orderNumber orderType guestInfo')
      .populate('items.product', 'name sku price');

    return NextResponse.json(
      {
        success: true,
        invoice: populatedInvoice,
      },
      { status: 201 }
    );
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to create invoice');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
