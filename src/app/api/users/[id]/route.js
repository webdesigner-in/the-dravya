import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { handleApiError } from '@/lib/errorHandler';

export async function GET(request, { params }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    const user = await User.findById(id).select('-password');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch user');
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}

export async function PUT(request, { params }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    const { name, email, role, phone, address, password } = await request.json();

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Name, email, and role are required' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email, _id: { $ne: id } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use by another user' }, { status: 400 });
    }

    const updateData = { name, email, role, phone: phone || '', address: address || '' };

    if (password && password.trim() !== '') {
      if (password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const mongoUpdate = { $set: updateData };
    if (password && password.trim() !== '') {
      mongoUpdate.$inc = { tokenVersion: 1 };
    }

    const user = await User.findByIdAndUpdate(id, mongoUpdate, {
      new: true,
      runValidators: true,
    }).select('-password');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to update user');
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    if (authUser.userId === id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to delete user');
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}
