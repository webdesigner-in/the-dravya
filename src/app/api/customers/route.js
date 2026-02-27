import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Customer from '@/models/Customer';
import { getAuthUser } from '@/lib/auth';

// GET all customers
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
    const customerType = searchParams.get('type');
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;

    const filter = {};
    if (customerType) filter.customerType = customerType;
    if (isActive !== null) filter.isActive = isActive === 'true';

    // Both admins and distributors can see all customers
    // No role-based filtering for customers

    const customers = await Customer.find(filter)
      .populate('assignedDistributor', 'name email')
      .sort({ createdAt: -1 });

    // Calculate pagination
    const totalCustomers = customers.length;
    const totalPages = Math.ceil(totalCustomers / limit);
    const skip = (page - 1) * limit;
    const paginatedCustomers = customers.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      customers: paginatedCustomers,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCustomers,
        itemsPerPage: limit,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// POST create new customer
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
    const {
      name,
      email,
      phone,
      alternatePhone,
      address,
      customerType,
      creditLimit,
      notes,
      assignedDistributor,
      coordinates, // Optional: [longitude, latitude]
    } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Please provide name and phone number' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if phone already exists
    const existingCustomer = await Customer.findOne({ phone });
    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Customer with this phone number already exists' },
        { status: 400 }
      );
    }

    const customerData = {
      name,
      email,
      phone,
      alternatePhone,
      address,
      customerType: customerType || 'residential',
      creditLimit: creditLimit || 0,
      notes,
      assignedDistributor: assignedDistributor || authUser.userId,
    };

    // Only add location if coordinates are provided
    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      customerData.location = {
        type: 'Point',
        coordinates: coordinates,
      };
    }

    const customer = await Customer.create(customerData);

    const populatedCustomer = await Customer.findById(customer._id).populate(
      'assignedDistributor',
      'name email'
    );

    return NextResponse.json(
      {
        success: true,
        customer: populatedCustomer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
