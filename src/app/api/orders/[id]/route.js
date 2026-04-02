import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';
import { createLogger } from '@/lib/logger';

const logger = createLogger('OrdersAPI');

export async function GET(request, { params }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const order = await Order.findById(id)
      .populate('customer', 'name phone email address')
      .populate('items.product', 'name sku size bottlesPerCarton')
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch order');
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}

export async function PUT(request, { params }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const isSimpleUpdate =
      (body.status || body.paymentStatus || body.paidAmount !== undefined) &&
      !body.items && !body.deliveryDate && !body.notes;

    if (!isSimpleUpdate && authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can edit order details.' },
        { status: 403 }
      );
    }

    if (body.items) {
      const currentOrder = await Order.findById(id).populate('items.product');
      if (!currentOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // Restore stock from old items
      if (currentOrder.items.length > 0) {
        await Product.bulkWrite(
          currentOrder.items.map(item => ({
            updateOne: {
              filter: { _id: item.product._id },
              update: { $inc: { stock: item.quantity } },
            },
          }))
        );
      }

      let subtotalAtOriginalPrice = 0;
      let subtotalAtCustomPrice   = 0;
      const validatedItems = [];
      const deducted       = [];

      for (const item of body.items) {
        const product = await Product.findById(item.product).select('name price').lean();
        if (!product) {
          // Rollback restored stock
          await Product.bulkWrite(
            currentOrder.items.map(i => ({
              updateOne: { filter: { _id: i.product._id }, update: { $inc: { stock: -i.quantity } } },
            }))
          ).catch(err => logger.error('Stock rollback failed', err));
          return NextResponse.json({ error: `Product not found: ${item.product}` }, { status: 404 });
        }

        const updated = await Product.findOneAndUpdate(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { returnDocument: 'after' }
        );

        if (!updated) {
          const rollbackOps = [
            ...currentOrder.items.map(i => ({
              updateOne: { filter: { _id: i.product._id }, update: { $inc: { stock: -i.quantity } } },
            })),
            ...deducted.map(d => ({
              updateOne: { filter: { _id: d.productId }, update: { $inc: { stock: d.quantity } } },
            })),
          ];
          await Product.bulkWrite(rollbackOps).catch(err => logger.error('Stock rollback failed', err));
          const current = await Product.findById(item.product).select('stock').lean();
          return NextResponse.json(
            { error: `Insufficient stock for ${product.name}. Available: ${current?.stock ?? 0}` },
            { status: 400 }
          );
        }

        deducted.push({ productId: item.product, quantity: item.quantity });

        const originalPrice      = parseFloat(product.price);
        const itemPrice          = item.customPrice ? parseFloat(item.customPrice) : originalPrice;
        const customSubtotal     = item.quantity * itemPrice;
        subtotalAtOriginalPrice += item.quantity * originalPrice;
        subtotalAtCustomPrice   += customSubtotal;

        validatedItems.push({
          product:            product._id,
          quantity:           item.quantity,
          price:              itemPrice,
          originalPrice,
          discountPercentage: originalPrice > itemPrice
            ? Math.round(((originalPrice - itemPrice) / originalPrice) * 100)
            : 0,
          subtotal: customSubtotal,
        });
      }

      const taxAmount  = currentOrder.tax || 0;
      body.items       = validatedItems;
      body.totalAmount = subtotalAtOriginalPrice;
      body.discount    = Math.max(0, subtotalAtOriginalPrice - subtotalAtCustomPrice);
      body.finalAmount = subtotalAtCustomPrice + taxAmount;
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    )
      .populate('customer', 'name phone email address')
      .populate('items.product', 'name sku size bottlesPerCarton')
      .populate('createdBy', 'name email');

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order, message: 'Order updated successfully' });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to update order');
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
      return NextResponse.json({ error: 'Unauthorized. Only admins can delete orders.' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    const order = await Order.findById(id).populate('items.product');
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const Invoice     = (await import('@/models/Invoice')).default;
    const Transaction = (await import('@/models/Transaction')).default;

    if (order.items.length > 0) {
      await Product.bulkWrite(
        order.items.map(item => ({
          updateOne: { filter: { _id: item.product._id }, update: { $inc: { stock: item.quantity } } },
        }))
      );
    }

    const [deletedInvoices, deletedTransactions] = await Promise.all([
      Invoice.deleteMany({ order: id }),
      Transaction.deleteMany({ order: id }),
    ]);

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
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to delete order');
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}
