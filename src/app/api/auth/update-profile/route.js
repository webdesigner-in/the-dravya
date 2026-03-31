import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
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

    const body = await request.json();
    const { name, email, phone, address, upiId, businessName } = body;

    await connectDB();

    const User = (await import('@/models/User')).default;

    // Build update object with only provided fields
    const updateFields = {};
    
    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) updateFields.email = email;
    if (phone !== undefined) updateFields.phone = phone;
    if (address !== undefined) updateFields.address = address;
    if (upiId !== undefined) updateFields.upiId = upiId;
    if (businessName !== undefined) updateFields.businessName = businessName;

    // If email is being updated, check if it's already taken
    if (email && email !== authUser.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== authUser.userId) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        );
      }
    }

    // Update using findByIdAndUpdate
    const user = await User.findByIdAndUpdate(
      authUser.userId,
      { $set: updateFields },
      { new: true, runValidators: false }
    )
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
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to update profile');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
