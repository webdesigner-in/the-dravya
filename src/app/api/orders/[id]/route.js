import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { getAuthUser } from '@/lib/auth';

// GET single order
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
    console.error('Get order error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// PUT update order
export async function PUT(request, { params }) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can update orders
    if (authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can update orders.' },
        { status: 403 }
      );
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();
    
    console.log('Updating order:', id, 'with data:', body);

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

    const order = await Order.findByIdAndUpdate(
      id,
      { $set: body },
      { returnDocument: 'after', runValidators: true }
    )
      .populate('customer', 'name phone email address')
      .populate('items.product', 'name sku size bottlesPerCarton')
      .populate('createdBy', 'name email');

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    console.log('Order updated successfully:', {
      id: order._id,
      totalAmount: order.totalAmount,
      finalAmount: order.finalAmount
    });

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// DELETE order
export async function DELETE(request, { params }) {
  try {
    const authUser = await getAuthUser();

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
    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    console.error('Delete order error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
