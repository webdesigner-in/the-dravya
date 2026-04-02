import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

export async function POST(request) {
  let authUser;
  try {
    authUser = await getAuthUser();

    // Only admins can create users
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can create users.' },
        { status: 403 }
      );
    }

    const { name, email, password, role, phone, address } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Please provide name, email and password' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    await connectDB();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      );
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'distributor',
      phone,
      address,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    }, { status: 201 });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to create user');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
