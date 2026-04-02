import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { generateToken, setAuthCookie } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

export async function POST(request) {
  try {
    const { name, email, password, phone, address } = await request.json();

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

    // Role is always 'distributor' for self-registration — never trust client-supplied role
    const user = await User.create({
      name,
      email,
      password,
      role: 'distributor',
      phone,
      address,
    });

    const token = generateToken(user._id.toString(), user.role);
    await setAuthCookie(token);

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
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to register user');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
