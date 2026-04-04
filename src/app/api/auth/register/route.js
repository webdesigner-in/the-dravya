import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { generateToken, setAuthCookie } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';
import { checkRateLimit } from '@/lib/rateLimit';
import { RATE_LIMITS } from '@/lib/constants';
import { getClientIp } from '@/lib/clientIp';
import { isPublicRegistrationAllowed } from '@/lib/publicRegistration';

export async function POST(request) {
  try {
    if (!isPublicRegistrationAllowed()) {
      return NextResponse.json(
        { error: 'Public registration is disabled. Contact an administrator.' },
        { status: 403 }
      );
    }

    const ip = getClientIp(request);
    const rl = await checkRateLimit(
      `register:${ip}`,
      RATE_LIMITS.REGISTER_ATTEMPTS,
      RATE_LIMITS.REGISTER_WINDOW_MS
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { name, email, password, phone, address } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Please provide name, email and password' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    await connectDB();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      );
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'distributor',
      phone,
      address,
    });

    const token = generateToken(
      user._id.toString(),
      user.role,
      user.tokenVersion ?? 0
    );
    await setAuthCookie(token);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(
      error,
      'Failed to register user'
    );
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
