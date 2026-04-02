"use client";

import { useAuthStore } from "@/store/authStore";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import api from "@/lib/apiClient";

export function AuthProvider({ children }) {
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const clearUser = useAuthStore((state) => state.clearUser);
  const pathname = usePathname();
  const router = useRouter();

  const hasFetched = useRef(false);

  // On mount, always verify session with the server once
  useEffect(() => {
    const isPublicPage =
      pathname === '/' ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/register');

    if (isPublicPage) {
      useAuthStore.setState({ isLoading: false });
      return;
    }

    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchUser();
    }
  }, [fetchUser]); // pathname intentionally omitted — run once on mount

  // Redirect to login only after loading is complete and user is not authenticated
  useEffect(() => {
    const isProtectedRoute = pathname.startsWith('/dashboard');
    if (isProtectedRoute && !isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [pathname, isAuthenticated, isLoading, router]);

  // Periodic session validation every 5 minutes — does NOT run immediately
  // (fetchUser on mount already handles the initial check)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      try {
        await api.get('/api/auth/me');
      } catch {
        clearUser();
        router.replace('/login');
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, clearUser, router]);

  // Show spinner while verifying session on protected routes
  const isProtectedRoute = pathname.startsWith('/dashboard');
  if (isLoading && isProtectedRoute) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <>{children}</>;
}
