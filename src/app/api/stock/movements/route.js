import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StockMovement from '@/models/StockMovement';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';

// GET all stock movements
export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const productId = searchParams.get('product');

    const filter = {};
    if (type) filter.type = type;
    if (productId) filter.product = productId;

    const movements = await StockMovement.find(filter)
      .populate('product', 'name sku')
      .populate('fromWarehouse', 'name code')
      .populate('toWarehouse', 'name code')
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json({
      success: true,
      movements,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// POST create stock movement
export async function POST(request) {
  let authUser;
  try {
    authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { product, type, quantity, fromWarehouse, toWarehouse, reason, reference, notes } = body;

    if (!product || !type || !quantity || !reason) {
      return NextResponse.json(
        { error: 'Please provide all required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    // Validate product exists
    const productDoc = await Product.findById(product);
    if (!productDoc) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Generate movement number
    const movementCount = await StockMovement.countDocuments();
    const movementNumber = `STK${String(movementCount + 1).padStart(6, '0')}`;

    // Create stock movement
    const movement = await StockMovement.create({
      movementNumber,
      product,
      type,
      quantity,
      fromWarehouse,
      toWarehouse,
      reason,
      reference,
      notes,
      performedBy: authUser.userId,
    });

    // Update product stock based on movement type
    if (type === 'in') {
      productDoc.stock += quantity;
    } else if (type === 'out' || type === 'damage') {
      if (productDoc.stock < quantity) {
        return NextResponse.json(
          { error: 'Insufficient stock' },
          { status: 400 }
        );
      }
      productDoc.stock -= quantity;
    } else if (type === 'adjustment') {
      productDoc.stock = quantity;
    }

    await productDoc.save();

    const populatedMovement = await StockMovement.findById(movement._id)
      .populate('product', 'name sku')
      .populate('performedBy', 'name email');

    return NextResponse.json({
      success: true,
      movement: populatedMovement,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
