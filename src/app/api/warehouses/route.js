import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Warehouse from '@/models/Warehouse';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

// GET all warehouses
export async function GET(request) {
  try {
    const authUser = await getAuthUser();

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
    console.error('Get warehouses error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// POST create warehouse
export async function POST(request) {
  try {
    const authUser = await getAuthUser();

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
      manager,
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
    console.error('Create warehouse error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
