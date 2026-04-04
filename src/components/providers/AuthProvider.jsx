"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/apiClient";

export function AuthProvider({ children }) {
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const pathname = usePathname();
  const router = useRouter();
  const redirectedRef = useRef(false);
  const wasPublicRef = useRef(true);

  useEffect(() => {
    const isPublicPage =
      pathname === "/" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/register");

    if (isPublicPage) {
      useAuthStore.setState({ isLoading: false });
      wasPublicRef.current = true;
      return;
    }

    if (wasPublicRef.current) {
      wasPublicRef.current = false;
      useAuthStore.getState().fetchUser();

      const timeout = setTimeout(() => {
        const state = useAuthStore.getState();
        if (state.isLoading && !state.isAuthenticated) {
          useAuthStore.setState({ isLoading: false });
          window.location.replace("/login");
        }
      }, 8_000);

      return () => clearTimeout(timeout);
    }
  }, [pathname]);

  useEffect(() => {
    if (!pathname.startsWith("/dashboard")) return;
    if (isLoading) return;
    if (isAuthenticated) {
      redirectedRef.current = false;
      return;
    }
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    router.replace("/login");
  }, [pathname, isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(async () => {
      try {
        await api.get("/api/auth/me");
      } catch {
        useAuthStore.getState().clearUser();
        window.location.replace("/login");
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return <>{children}</>;
}
