import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PriceHistory from '@/models/PriceHistory';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product');

    const filter = productId ? { product: productId } : {};
    const history = await PriceHistory.find(filter)
      .populate('product', 'name sku size')
      .populate('recordedBy', 'name')
      .sort({ effectiveFrom: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({ success: true, history });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch price history');
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}

export async function POST(request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();
    const { productId, costPrice, sellingPrice, effectiveFrom, notes } = await request.json();

    if (!productId || costPrice == null || sellingPrice == null) {
      return NextResponse.json({ error: 'productId, costPrice and sellingPrice are required' }, { status: 400 });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const entry = await PriceHistory.create({
      product:      productId,
      costPrice:    parseFloat(costPrice),
      sellingPrice: parseFloat(sellingPrice),
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      notes,
      recordedBy:   authUser.userId,
    });

    // Also update the product's current prices
    await Product.findByIdAndUpdate(productId, {
      costPrice:    parseFloat(costPrice),
      price:        parseFloat(sellingPrice),
    });

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to record price change');
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}
