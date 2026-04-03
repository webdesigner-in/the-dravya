"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/apiClient";

export function AuthProvider({ children }) {
  const isLoading       = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const pathname        = usePathname();
  const router          = useRouter();
  const redirectedRef   = useRef(false);

  // Verify session ONCE on mount
  useEffect(() => {
    const isPublicPage =
      pathname === '/' ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/register');

    if (isPublicPage) {
      useAuthStore.setState({ isLoading: false });
      return;
    }

    useAuthStore.getState().fetchUser();

    // Safety net: never stuck on spinner longer than 10s
    const timeout = setTimeout(() => {
      const { isLoading: still, isAuthenticated: authed } = useAuthStore.getState();
      if (still && !authed) {
        useAuthStore.setState({ isLoading: false });
        window.location.replace('/login');
      }
    }, 10_000);

    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only

  // Redirect unauthenticated users — use ref to prevent firing more than once
  useEffect(() => {
    if (!pathname.startsWith('/dashboard')) return;
    if (isLoading) return;
    if (isAuthenticated) {
      redirectedRef.current = false; // reset on successful auth
      return;
    }
    if (redirectedRef.current) return; // already redirected
    redirectedRef.current = true;
    router.replace('/login');
  }, [pathname, isAuthenticated, isLoading, router]);

  // Periodic session check every 5 minutes
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(async () => {
      try {
        await api.get('/api/auth/me');
      } catch {
        useAuthStore.getState().clearUser();
        window.location.replace('/login');
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Spinner on protected routes while loading
  if (isLoading && pathname.startsWith('/dashboard')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <>{children}</>;
}
