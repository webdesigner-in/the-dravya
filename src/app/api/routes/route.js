import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Route from '@/models/Route';
import Vehicle from '@/models/Vehicle';
import Customer from '@/models/Customer';
import Order from '@/models/Order';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { generateRouteNumber } from '@/lib/numberGenerator';

// GET all routes
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
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    const filter = {};
    if (status) filter.status = status;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const routes = await Route.find(filter)
      .populate('vehicle', 'vehicleNumber vehicleType')
      .populate('driver', 'name phone')
      .populate('stops.customer', 'name phone address')
      .populate('stops.order', 'orderNumber')
      .populate('createdBy', 'name')
      .sort({ date: -1 });

    return NextResponse.json({
      success: true,
      routes,
    });
  } catch (error) {
    console.error('Get routes error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// POST create route
export async function POST(request) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    await connectDB();

    // Generate unique route number using utility function
    const routeNumber = generateRouteNumber();

    const route = await Route.create({
      ...body,
      routeNumber,
      createdBy: authUser.userId,
    });

    const populatedRoute = await Route.findById(route._id)
      .populate('vehicle', 'vehicleNumber vehicleType')
      .populate('driver', 'name phone')
      .populate('stops.customer', 'name phone address')
      .populate('stops.order', 'orderNumber');

    return NextResponse.json(
      {
        success: true,
        route: populatedRoute,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create route error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
