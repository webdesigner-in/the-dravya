import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

export async function GET() {
  let authUser;
  try {
    authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    await connectDB();

    const User = (await import('@/models/User')).default;

    // Use lean() to get plain object and bypass any Mongoose getters/virtuals
    const user = await User.findById(authUser.userId)
      .select('-password')
      .lean({ virtuals: false, getters: false })
      .exec();

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
        phone: user.phone || '',
        address: user.address || '',
        upiId: user.upiId || '',
        businessName: user.businessName || '',
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch user info');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
