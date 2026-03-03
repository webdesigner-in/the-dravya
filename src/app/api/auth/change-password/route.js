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

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Please provide current and new password' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(authUser.userId).select('+password');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
