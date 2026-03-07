import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

// GET all products
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
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    const filter = {};
    if (category) filter.category = category;
    if (isActive !== null) filter.isActive = isActive === 'true';

    const products = await Product.find(filter).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch products');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}

// POST create new product
export async function POST(request) {
  let authUser;
  try {
    authUser = await getAuthUser();

    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can create products.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, category, size, price, costPrice, sku, barcode, stock, minStockLevel, image, bottlesPerCarton } = body;

    if (!name || !price || !costPrice || !sku || !size || !bottlesPerCarton) {
      return NextResponse.json(
        { error: 'Please provide all required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product with this SKU already exists' },
        { status: 400 }
      );
    }

    const product = await Product.create({
      name,
      description,
      category,
      size,
      price,
      costPrice,
      sku,
      barcode,
      bottlesPerCarton,
      stock: stock || 0,
      minStockLevel: minStockLevel || 10,
      image,
    });

    return NextResponse.json({
      success: true,
      product,
    }, { status: 201 });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to create product');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
