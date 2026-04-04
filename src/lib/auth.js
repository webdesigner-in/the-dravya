import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import connectDB from '@/lib/mongodb';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Please define the JWT_SECRET environment variable');
}

const JWT_OPTIONS = {
  expiresIn: '24h',
  algorithm: 'HS256',
};

const VERIFY_OPTIONS = { algorithms: ['HS256'] };

export function generateToken(userId, role, tokenVersion = 0) {
  return jwt.sign(
    { userId, role, tv: tokenVersion },
    JWT_SECRET,
    JWT_OPTIONS
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, VERIFY_OPTIONS);
  } catch {
    return null;
  }
}

/**
 * Validates JWT + tokenVersion + role against the database (session invalidation on logout/password change).
 */
export async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');

  if (!token?.value) {
    return null;
  }

  const decoded = verifyToken(token.value);
  if (!decoded?.userId) {
    return null;
  }

  await connectDB();
  const User = (await import('@/models/User')).default;
  const user = await User.findById(decoded.userId).select('tokenVersion role').lean();

  if (!user) {
    return null;
  }

  const tokenTv =
    decoded.tv !== undefined && decoded.tv !== null ? Number(decoded.tv) : 0;
  const currentTv = user.tokenVersion ?? 0;
  if (tokenTv !== currentTv) {
    return null;
  }
  if (decoded.role !== user.role) {
    return null;
  }

  return { userId: String(decoded.userId), role: user.role };
}

export async function setAuthCookie(token) {
  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
}
