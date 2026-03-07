import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';
import cache from '@/lib/cache';

// GET single product
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
    const product = await Product.findById(id);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch product');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}

// PUT update product
export async function PUT(request, { params }) {
  let authUser;
  try {
    authUser = await getAuthUser();

    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true, returnDocument: 'after' }
    );

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Invalidate products cache
    cache.delete(`products_all_all`);
    cache.delete(`products_${product.category}_all`);
    cache.delete(`products_all_true`);
    cache.delete(`products_${product.category}_true`);
    cache.delete(`products_all_false`);
    cache.delete(`products_${product.category}_false`);

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to update product');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}

// DELETE product
export async function DELETE(request, { params }) {
  let authUser;
  try {
    authUser = await getAuthUser();

    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await connectDB();

    const { id } = await params;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Invalidate products cache
    cache.delete(`products_all_all`);
    cache.delete(`products_${product.category}_all`);
    cache.delete(`products_all_true`);
    cache.delete(`products_${product.category}_true`);
    cache.delete(`products_all_false`);
    cache.delete(`products_${product.category}_false`);

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to delete product');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
