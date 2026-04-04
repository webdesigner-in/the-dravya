import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyToken, removeAuthCookie } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get('auth-token')?.value;
    const decoded = raw ? verifyToken(raw) : null;

    await connectDB();
    if (decoded?.userId) {
      await User.updateOne({ _id: decoded.userId }, { $inc: { tokenVersion: 1 } });
    }

    await removeAuthCookie();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to logout');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
