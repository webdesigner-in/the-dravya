import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

const VERIFY_OPTIONS = { algorithms: ['HS256'] };

export function generateToken(userId, role, sessionId) {
  return jwt.sign(
    { userId, role, sid: sessionId },
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
  const Session = (await import('@/models/Session')).default;
  const [user, session] = await Promise.all([
    User.findById(decoded.userId).select('role isActive').lean(),
    decoded.sid
      ? Session.findOne({ sessionId: decoded.sid, user: decoded.userId }).select('role expiresAt').lean()
      : null,
  ]);

  if (!user) {
    return null;
  }
  if (!user.isActive) {
    return null;
  }
  if (decoded.role !== user.role) {
    return null;
  }
  if (!session) {
    return null;
  }
  if (session.role !== user.role) {
    return null;
  }
  if (session.expiresAt <= new Date()) {
    return null;
  }

  return { userId: String(decoded.userId), role: user.role, sessionId: decoded.sid };
}

export async function createAuthSession(userId, role) {
  await connectDB();
  const Session = (await import('@/models/Session')).default;
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await Session.create({
    user: userId,
    sessionId,
    role,
    expiresAt,
  });

  return sessionId;
}

export async function invalidateSession(sessionId) {
  if (!sessionId) return;
  await connectDB();
  const Session = (await import('@/models/Session')).default;
  await Session.deleteOne({ sessionId });
}

export async function invalidateAllUserSessions(userId) {
  if (!userId) return;
  await connectDB();
  const Session = (await import('@/models/Session')).default;
  await Session.deleteMany({ user: userId });
}

export async function setAuthCookie(token) {
  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
}
