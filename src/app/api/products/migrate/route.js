import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';

// Migration endpoint to add bottlesPerCarton to existing products
export async function POST(request) {
  try {
    const authUser = await getAuthUser();

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
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
