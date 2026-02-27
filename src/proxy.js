import { NextResponse } from 'next/server';

export function proxy(request) {
  try {
    const token = request.cookies.get('auth-token');
    const pathname = request.nextUrl?.pathname || '';

    // If accessing dashboard without token, redirect to login
    if (pathname.startsWith('/dashboard') && !token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // If accessing login with valid token, redirect to dashboard
    if (pathname.startsWith('/login') && token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
    '/dashboard/:path*',
    '/login',
  ],
};
