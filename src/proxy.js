import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { checkRateLimit } from '@/lib/rateLimit';
import { RATE_LIMITS } from '@/lib/constants';
import { getClientIp } from '@/lib/clientIp';

const PROTECTED_PATHS = ['/dashboard'];
const AUTH_PATHS = ['/login', '/register'];

/**
 * Verify a JWT (Edge-compatible). Must match HS256 + JWT_SECRET used in @/lib/auth.
 */
async function verifyToken(token) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return payload;
  } catch {
    return null;
  }
}

function retryAfterSeconds(rl) {
  const sec = Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000);
  return Math.max(1, sec);
}

/**
 * Next.js 16+ Proxy (formerly Middleware).
 */
export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;

  const skipRateLimit =
    pathname === '/api/health' ||
    pathname === '/api/health/ready' ||
    pathname === '/api/auth/me' ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/register';

  if (pathname.startsWith('/api') && !skipRateLimit) {
    const ip = getClientIp(request);
    const rl = await checkRateLimit(
      `api:${ip}`,
      RATE_LIMITS.API_GLOBAL_ATTEMPTS,
      RATE_LIMITS.API_GLOBAL_WINDOW_MS
    );

    if (!rl.allowed) {
      const retry = retryAfterSeconds(rl);
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: retry,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retry) },
        }
      );
    }
  }

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyToken(token);
    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth-token');
      return response;
    }
  }

  if (
    (pathname === '/' ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/register')) &&
    token
  ) {
    const payload = await verifyToken(token);
    if (payload) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register', '/api/:path*', '/'],
};
