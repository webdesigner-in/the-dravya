import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

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
 * • Unauthenticated requests to /dashboard/* → redirect to /login
 * • Expired / invalid JWT → clear the cookie and redirect to /login
 * • Already-authenticated users hitting /login or /register → redirect to /dashboard
 */
export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;

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

  // ── Auth pages (login / register) ────────────────────────────────────────────────────────
  // Redirect already-authenticated users away from auth pages
  if (isAuthPage && token) {
    const payload = await verifyToken(token);
    if (payload) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run only on these paths — skip API routes, static assets, and image optimisation
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
