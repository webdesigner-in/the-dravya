import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';
import { retryOperation, delay } from '@/lib/retryHelper';

// GET single order
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
    const order = await Order.findById(id)
      .populate('customer', 'name phone email address')
      .populate('items.product', 'name sku size bottlesPerCarton')
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch order',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// PUT update order
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

    await connectDB();

    const { id } = await params;
    const body = await request.json();
    
    // Check if this is a simple status/payment update (allowed for all) or full edit (admin only)
    const isSimpleUpdate = (body.status || body.paymentStatus || body.paidAmount !== undefined) && 
                           !body.items && 
                           !body.deliveryDate && 
                           !body.notes;

    // Only admins can do full order edits (items, delivery date, notes)
    if (!isSimpleUpdate && authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can edit order details.' },
        { status: 403 }
      );
    }

    // If items are being updated, we need to recalculate totals and manage stock
    if (body.items) {
      const Product = (await import('@/models/Product')).default;
      
      // Get the current order to restore stock
      const currentOrder = await Order.findById(id).populate('items.product');
      
      if (!currentOrder) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      // Restore stock from old items
      for (const item of currentOrder.items) {
        const product = await Product.findById(item.product._id);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }

      // Validate and process new items
      let subtotalAtOriginalPrice = 0;
      let subtotalAtCustomPrice = 0;
      const validatedItems = [];

      for (const item of body.items) {
        const product = await Product.findById(item.product);
        if (!product) {
          return NextResponse.json(
            { error: `Product not found: ${item.product}` },
            { status: 404 }
          );
        }

        // Check stock availability
        if (product.stock < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for ${product.name}. Available: ${product.stock}` },
            { status: 400 }
          );
        }

        // Calculate at original price
        const originalPrice = parseFloat(product.price);
        const originalSubtotal = item.quantity * originalPrice;
        subtotalAtOriginalPrice += originalSubtotal;

        // Use custom price if provided, otherwise use product price
        const itemPrice = item.customPrice ? parseFloat(item.customPrice) : originalPrice;
        const customSubtotal = item.quantity * itemPrice;
        subtotalAtCustomPrice += customSubtotal;

        validatedItems.push({
          product: product._id,
          quantity: item.quantity,
          price: itemPrice,
          subtotal: customSubtotal,
        });

        // Reduce stock
        product.stock -= item.quantity;
        await product.save();
      }

      // Calculate discount and totals
      const calculatedDiscount = subtotalAtOriginalPrice - subtotalAtCustomPrice;
      const discountAmount = calculatedDiscount > 0 ? calculatedDiscount : 0;
      const taxAmount = currentOrder.tax || 0;
      
      const totalAmount = subtotalAtOriginalPrice;
      const finalAmount = subtotalAtCustomPrice + taxAmount;

      // Update order with new items and recalculated totals
      body.items = validatedItems;
      body.totalAmount = totalAmount;
      body.discount = discountAmount;
      body.finalAmount = finalAmount;
    }

    // Update order with retry logic
    const order = await retryOperation(async () => {
      const updatedOrder = await Order.findByIdAndUpdate(
        id,
        { $set: body },
        { returnDocument: 'after', runValidators: true }
      )
        .populate('customer', 'name phone email address')
        .populate('items.product', 'name sku size bottlesPerCarton')
        .populate('createdBy', 'name email');

      if (!updatedOrder) {
        const error = new Error('Order not found');
        error.status = 404;
        throw error;
      }

      return updatedOrder;
    }, 3, 500); // 3 retries with 500ms initial delay

    // Add small delay to ensure database consistency
    await delay(300);

    return NextResponse.json({
      success: true,
      order,
      message: 'Order updated successfully'
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to update order');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}

// DELETE order
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

    // Only admins can delete orders
    if (authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can delete orders.' },
        { status: 403 }
      );
    }

    await connectDB();

    const { id } = await params;
    
    // Get the order with populated items to restore stock
    const order = await Order.findById(id).populate('items.product');

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Import models needed for cascade deletion
    const Product = (await import('@/models/Product')).default;
    const Invoice = (await import('@/models/Invoice')).default;
    const Transaction = (await import('@/models/Transaction')).default;

    // 1. Restore stock for all items in the order
    for (const item of order.items) {
      const product = await Product.findById(item.product._id);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    // 2. Delete all related invoices
    const deletedInvoices = await Invoice.deleteMany({ order: id });

    // 3. Delete all related transactions
    const deletedTransactions = await Transaction.deleteMany({ order: id });

    // 4. Finally, delete the order
    await Order.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Order and all related records deleted successfully',
      details: {
        stockRestored: order.items.length,
        invoicesDeleted: deletedInvoices.deletedCount,
        transactionsDeleted: deletedTransactions.deletedCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: error.message || 'Failed to delete order',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
