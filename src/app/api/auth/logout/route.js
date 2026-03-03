import { NextResponse } from 'next/server';
import { removeAuthCookie } from '@/lib/auth';

export async function POST() {
  try {
    await removeAuthCookie();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
