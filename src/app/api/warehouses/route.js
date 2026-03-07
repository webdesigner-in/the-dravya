import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Warehouse from '@/models/Warehouse';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

// GET all warehouses
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
    const isActive = searchParams.get('isActive');

    const filter = {};
    if (type) filter.type = type;
    if (isActive) filter.isActive = isActive === 'true';

    const warehouses = await Warehouse.find(filter)
      .populate('manager', 'name email phone')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      warehouses,
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch warehouses');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}

// POST create warehouse
export async function POST(request) {
  let authUser;
  try {
    authUser = await getAuthUser();

    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      code,
      address,
      capacity,
      manager,
      contactNumber,
      email,
      type,
      facilities,
      operatingHours,
      notes,
    } = body;

    if (!name || !code || !capacity) {
      return NextResponse.json(
        { error: 'Please provide all required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if code already exists
    const existingWarehouse = await Warehouse.findOne({ code: code.toUpperCase() });
    if (existingWarehouse) {
      return NextResponse.json(
        { error: 'Warehouse code already exists' },
        { status: 400 }
      );
    }

    const warehouse = await Warehouse.create({
      name,
      code: code.toUpperCase(),
      address,
      capacity,
      manager: manager && manager !== '' ? manager : undefined, // Only set if not empty
      contactNumber,
      email,
      type,
      facilities,
      operatingHours,
      notes,
    });

    const populatedWarehouse = await Warehouse.findById(warehouse._id)
      .populate('manager', 'name email phone');

    return NextResponse.json(
      {
        success: true,
        warehouse: populatedWarehouse,
      },
      { status: 201 }
    );
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to create warehouse');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
