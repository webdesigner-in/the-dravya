import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { invalidateSession, removeAuthCookie, verifyToken } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get('auth-token')?.value;
    const decoded = raw ? verifyToken(raw) : null;
    if (decoded?.sid) {
      await invalidateSession(decoded.sid);
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
