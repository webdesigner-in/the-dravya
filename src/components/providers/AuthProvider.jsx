"use client";

import { useAuthStore } from "@/store/authStore";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

export function AuthProvider({ children }) {
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const clearUser = useAuthStore((state) => state.clearUser);
  const pathname = usePathname();
  const router = useRouter();

  // Track whether we've already fired the /api/auth/me request so we never
  // repeat it on every client-side navigation.  The ref persists across renders
  // without triggering re-renders itself.
  const hasFetched = useRef(false);

  useEffect(() => {
    const isPublicPage =
      pathname === '/' ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/register');

    if (isPublicPage) {
      useAuthStore.setState({ isLoading: false });
      return;
    }

    // Only call the API once per mount — never again on navigation
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchUser();
    }
  }, [fetchUser]); // pathname intentionally omitted — we only want this to run once

  // Redirect to login if user tries to access protected routes without authentication
  useEffect(() => {
    const isProtectedRoute = pathname.startsWith('/dashboard');
    
    if (isProtectedRoute && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [pathname, isAuthenticated, isLoading, router]);

  // Periodic session validation (every 5 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;

    const validateSession = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          // Session expired - clear auth and redirect
          clearUser();
          if (pathname.startsWith('/dashboard')) {
            router.push('/login');
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Session validation failed:', error);
        }
        // On network error, don't automatically log out
      }
    };

    // Validate immediately if we have a user
    validateSession();

    // Set up periodic validation
    const interval = setInterval(validateSession, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, clearUser, router, pathname]);

  if (isLoading && !pathname.startsWith('/login') && !pathname.startsWith('/register') && pathname !== '/') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <>{children}</>;
}
