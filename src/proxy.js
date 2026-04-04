import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { checkRateLimit } from '@/lib/rateLimit';

const PROTECTED_PATHS = ['/dashboard'];
const AUTH_PATHS      = ['/login', '/register'];

/**
 * Verify a JWT token using jose (Edge-compatible — no Node.js crypto APIs).
 * Returns the decoded payload or null if invalid / expired.
 */
async function verifyToken(token) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Next.js 16+ Proxy (formerly Middleware).
 *
 * • Rate limiting for API routes
 * • Unauthenticated requests to /dashboard/* → redirect to /login
 * • Expired / invalid JWT → clear the cookie and redirect to /login
 * • Already-authenticated users hitting /login or /register → redirect to /dashboard
 */
export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;

  // ── Rate Limiting for API routes ──────────────────────────────────────────────────────────
  // Only apply to data-mutating and data-fetching endpoints, skip health and auth checks
  const skipRateLimit = pathname === '/api/health' || pathname === '/api/auth/me';

  if (pathname.startsWith('/api') && !skipRateLimit) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const rl = await checkRateLimit(`api:${ip}`, 100, 60_000);
    
    if (!rl.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(rl.resetIn / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rl.resetIn / 1000))
          }
        }
      );
    }
  }

  const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p));
  const isAuthPage  = AUTH_PATHS.some(p => pathname.startsWith(p));

  // ── Protected routes ──────────────────────────────────────────────────────────────────────
  if (isProtected) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyToken(token);
    if (!payload) {
      // Token invalid or expired — clear cookie and redirect
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth-token');
      return response;
    }
  }

  // ── Root path & login — redirect authenticated users to dashboard ────────────
  if ((pathname === '/' || pathname.startsWith('/login')) && token) {
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
