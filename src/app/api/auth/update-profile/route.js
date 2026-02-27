import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

export async function PUT(request) {
  try {
    const authUser = await getAuthUser();

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
      { new: true, returnDocument: 'after' }
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
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
