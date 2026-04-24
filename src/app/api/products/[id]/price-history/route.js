import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PriceHistory from '@/models/PriceHistory';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

// GET price history for a product
export async function GET(request, { params }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id } = await params;

    const history = await PriceHistory.find({ product: id })
      .sort({ effectiveFrom: -1 })
      .populate('recordedBy', 'name')
      .lean();

    return NextResponse.json({ success: true, history });
  } catch (error) {
    const { error: e, statusCode, details } = handleApiError(error, 'Failed to fetch price history');
    return NextResponse.json({ error: e, details }, { status: statusCode });
  }
}

// POST manually record a price point
export async function POST(request, { params }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    const { costPrice, sellingPrice, effectiveFrom, notes } = await request.json();

    if (!costPrice || !sellingPrice) {
      return NextResponse.json({ error: 'costPrice and sellingPrice are required' }, { status: 400 });
    }

    const product = await Product.findById(id);
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const entry = await PriceHistory.create({
      product: id,
      costPrice:    parseFloat(costPrice),
      sellingPrice: parseFloat(sellingPrice),
      // Always store as UTC first day of the month to avoid timezone issues
      effectiveFrom: effectiveFrom
        ? new Date(Date.UTC(new Date(effectiveFrom).getUTCFullYear(), new Date(effectiveFrom).getUTCMonth(), 1))
        : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)),
      notes,
      recordedBy: authUser.userId,
    });

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (error) {
    const { error: e, statusCode, details } = handleApiError(error, 'Failed to record price');
    return NextResponse.json({ error: e, details }, { status: statusCode });
  }
}
