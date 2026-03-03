import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Customer from '@/models/Customer';
import { getAuthUser } from '@/lib/auth';
import { errorResponse, successResponse, parsePagination, buildPaginationResponse } from '@/lib/apiHelpers';
import { createLogger } from '@/lib/logger';

const logger = createLogger('CustomersAPI');

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
    const search = searchParams.get('search');
    const { page, limit, skip } = parsePagination(searchParams);

    const filter = {};
    if (customerType) filter.customerType = customerType;
    if (isActive !== null) filter.isActive = isActive === 'true';

    // Search filter - search across name, phone, email, area, city
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { 'address.area': searchRegex },
        { 'address.city': searchRegex },
        { 'address.street': searchRegex }
      ];
    }

    // Both admins and distributors can see all customers
    // No role-based filtering for customers

    // Use lean() for better performance and limit fields
    const [customers, totalCustomers] = await Promise.all([
      Customer.find(filter)
        .select('name email phone alternatePhone address customerType creditLimit outstandingBalance isActive assignedDistributor')
        .populate('assignedDistributor', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Customer.countDocuments(filter)
    ]);

    logger.info(`Fetched ${customers.length} customers`, { userId: authUser.userId, page, limit });

    const response = buildPaginationResponse(customers, totalCustomers, page, limit);
    
    return NextResponse.json({
      success: true,
      customers: response.items,
      pagination: response.pagination
    });
  } catch (error) {
    logger.error('Get customers error', error, { userId: authUser?.userId });
    return errorResponse(error, 'Failed to fetch customers');
  }
}

// POST create new customer

// POST create customer
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
    const existingCustomer = await Customer.findOne({ phone }).lean();
    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Customer with this phone number already exists' },
        { status: 409 }
      );
    }

    const customerData = {
      name: name.trim(),
      email: email?.trim(),
      phone: phone.trim(),
      alternatePhone: alternatePhone?.trim(),
      address,
      customerType: customerType || 'residential',
      creditLimit: parseFloat(creditLimit) || 0,
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

    const populatedCustomer = await Customer.findById(customer._id)
      .populate('assignedDistributor', 'name email')
      .lean();

    logger.info('Customer created', { customerId: customer._id, userId: authUser.userId });

    return NextResponse.json({
      success: true,
      customer: populatedCustomer
    }, { status: 201 });
  } catch (error) {
    logger.error('Create customer error', error, { userId: authUser?.userId });
    return errorResponse(error, 'Failed to create customer');
  }
}

