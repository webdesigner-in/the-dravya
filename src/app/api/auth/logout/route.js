import { NextResponse } from 'next/server';
import { removeAuthCookie } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

export async function POST() {
  try {
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
