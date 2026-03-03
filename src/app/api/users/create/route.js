import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

export async function POST(request) {
  try {
    const authUser = await getAuthUser();

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

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
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
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
