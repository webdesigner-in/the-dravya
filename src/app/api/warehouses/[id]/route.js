import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Warehouse from '@/models/Warehouse';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';
import { retryOperation, delay } from '@/lib/retryHelper';

// GET single warehouse
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
    const warehouse = await Warehouse.findById(id)
      .populate('manager', 'name email phone');

    if (!warehouse) {
      return NextResponse.json(
        { error: 'Warehouse not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      warehouse,
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch warehouse');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}

// PUT update warehouse
export async function PUT(request, { params }) {
  let authUser;
  try {
    authUser = await getAuthUser();

    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();

    // Clean up empty string fields that should be ObjectId
    if (body.manager === '') {
      body.manager = undefined;
    }

    // Update warehouse with retry logic
    const warehouse = await retryOperation(async () => {
      const updatedWarehouse = await Warehouse.findByIdAndUpdate(
        id,
        { $set: body },
        { returnDocument: 'after', runValidators: true }
      ).populate('manager', 'name email phone');

      if (!updatedWarehouse) {
        const error = new Error('Warehouse not found');
        error.status = 404;
        throw error;
      }

      return updatedWarehouse;
    }, 3, 500);

    // Add small delay to ensure database consistency
    await delay(300);

    return NextResponse.json({
      success: true,
      warehouse,
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to update warehouse');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}

// DELETE warehouse
export async function DELETE(request, { params }) {
  let authUser;
  try {
    authUser = await getAuthUser();

    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await params;
    const warehouse = await Warehouse.findByIdAndDelete(id);

    if (!warehouse) {
      return NextResponse.json(
        { error: 'Warehouse not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Warehouse deleted successfully',
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to delete warehouse');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
