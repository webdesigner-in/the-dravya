import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Vehicle from '@/models/Vehicle';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

// GET all vehicles
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
    const status = searchParams.get('status');

    const filter = {};
    if (status) filter.status = status;

    const vehicles = await Vehicle.find(filter)
      .populate('driver', 'name phone email')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      vehicles,
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch vehicles');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}

// POST create vehicle
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

    await connectDB();

    // Clean up empty string for driver field
    if (body.driver === '') {
      body.driver = undefined;
    }

    // Check if vehicle number already exists
    const existingVehicle = await Vehicle.findOne({
      vehicleNumber: body.vehicleNumber.toUpperCase(),
    });
    if (existingVehicle) {
      return NextResponse.json(
        { error: 'Vehicle number already exists' },
        { status: 400 }
      );
    }

    const vehicle = await Vehicle.create({
      ...body,
      vehicleNumber: body.vehicleNumber.toUpperCase(),
    });

    const populatedVehicle = await Vehicle.findById(vehicle._id).populate(
      'driver',
      'name phone email'
    );

    return NextResponse.json(
      {
        success: true,
        vehicle: populatedVehicle,
      },
      { status: 201 }
    );
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to create vehicle');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
