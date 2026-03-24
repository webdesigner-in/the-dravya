import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

export async function PUT(request) {
  let authUser;
  try {
    authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, email, phone, address } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Please provide name and email' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if email is already taken by another user
    if (email !== authUser.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== authUser.userId) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        );
      }
    }

    const user = await User.findByIdAndUpdate(
      authUser.userId,
      {
        $set: {
          name,
          email,
          phone,
          address,
        },
      },
      { returnDocument: 'after' }
    ).select('-password');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to update profile');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
