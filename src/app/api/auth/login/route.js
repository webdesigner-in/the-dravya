import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { generateToken, setAuthCookie } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';
import { checkRateLimit } from '@/lib/rateLimit';
import { RATE_LIMITS } from '@/lib/constants';
import { getClientIp } from '@/lib/clientIp';

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const rl = await checkRateLimit(`login:${ip}`, RATE_LIMITS.LOGIN_ATTEMPTS, RATE_LIMITS.LOGIN_WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again in a minute.' },
        { status: 429 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Please provide email and password' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = generateToken(
      user._id.toString(),
      user.role,
      user.tokenVersion ?? 0
    );
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        upiId: user.upiId,
        businessName: user.businessName,
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to login');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
