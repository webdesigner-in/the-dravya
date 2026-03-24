import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StockMovement from '@/models/StockMovement';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';
import { generateMovementNumber } from '@/lib/numberGenerator';

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
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch stock movements');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
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

    // Generate collision-safe movement number (crypto random, no countDocuments race)
    const movementNumber = generateMovementNumber();

    // Atomically update stock BEFORE creating the movement record.
    // Using findOneAndUpdate eliminates the read-check-write race condition.
    let updatedProduct;
    if (type === 'in') {
      // Adding stock: always safe, no floor check needed
      updatedProduct = await Product.findOneAndUpdate(
        { _id: product },
        { $inc: { stock: quantity } },
        { returnDocument: 'after' }
      );
    } else if (type === 'out' || type === 'damage') {
      // Deducting stock: only succeeds if stock >= quantity (atomic)
      updatedProduct = await Product.findOneAndUpdate(
        { _id: product, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { returnDocument: 'after' }
      );
      if (!updatedProduct) {
        return NextResponse.json(
          { error: `Insufficient stock. Available: ${productDoc.stock}` },
          { status: 400 }
        );
      }
    } else if (type === 'adjustment') {
      // Direct set: atomic by definition
      updatedProduct = await Product.findOneAndUpdate(
        { _id: product },
        { $set: { stock: quantity } },
        { returnDocument: 'after' }
      );
    }

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

    const populatedMovement = await StockMovement.findById(movement._id)
      .populate('product', 'name sku')
      .populate('performedBy', 'name email');

    return NextResponse.json({
      success: true,
      movement: populatedMovement,
    }, { status: 201 });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to create stock movement');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
