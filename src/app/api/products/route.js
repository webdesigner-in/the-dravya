import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';
import cache, { CACHE_TTL } from '@/lib/cache';

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

    // Create cache key based on filters
    const cacheKey = `products_${category || 'all'}_${isActive || 'all'}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'X-Cache': 'HIT',
        },
      });
    }

    const filter = {};
    if (category) filter.category = category;
    if (isActive !== null) filter.isActive = isActive === 'true';

    const products = await Product.find(filter).sort({ createdAt: -1 });

    const responseData = {
      success: true,
      products,
    };

    // Cache for 10 minutes (products don't change frequently)
    cache.set(cacheKey, responseData, CACHE_TTL.PRODUCTS);

    return NextResponse.json(responseData, {
      headers: {
        'X-Cache': 'MISS',
      },
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

    // Invalidate products cache
    cache.delete(`products_all_all`);
    cache.delete(`products_${category}_all`);
    cache.delete(`products_all_true`);
    cache.delete(`products_${category}_true`);

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
