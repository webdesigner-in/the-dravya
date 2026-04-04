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

  // Verify session once on mount for protected routes
  useEffect(() => {
    const isPublicPage =
      pathname === '/' ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/register');

    if (isPublicPage) {
      // proxy.js handles redirecting authenticated users away from public pages
      useAuthStore.setState({ isLoading: false });
      return;
    }

    // Protected route — verify session with server
    useAuthStore.getState().fetchUser();

    // Safety net: if fetchUser never resolves, stop after 8s
    const timeout = setTimeout(() => {
      const state = useAuthStore.getState();
      if (state.isLoading && !state.isAuthenticated) {
        useAuthStore.setState({ isLoading: false });
        window.location.replace('/login');
      }
    }, 8_000);

    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only

  // Redirect unauthenticated users after loading completes
  useEffect(() => {
    if (!pathname.startsWith('/dashboard')) return;
    if (isLoading) return;
    if (isAuthenticated) {
      redirectedRef.current = false;
      return;
    }
    if (redirectedRef.current) return;
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

  return <>{children}</>;
}
