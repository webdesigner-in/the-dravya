import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

// Migration endpoint to add bottlesPerCarton to existing products
export async function POST(request) {
  let authUser;
  try {
    authUser = await getAuthUser();

    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can run migrations.' },
        { status: 403 }
      );
    }

    await connectDB();

    // Update all products without bottlesPerCarton field
    const result = await Product.updateMany(
      { bottlesPerCarton: { $exists: false } },
      { $set: { bottlesPerCarton: 1 } }
    );

    return NextResponse.json({
      success: true,
      message: `Updated ${result.modifiedCount} products with default bottlesPerCarton value`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to run migration');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
