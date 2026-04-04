"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/apiClient";

export function AuthProvider({ children }) {
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authError = useAuthStore((state) => state.authError);
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
    }
  }, [pathname]);

  useEffect(() => {
    if (!pathname.startsWith("/dashboard")) return;
    if (isLoading) return;
    if (authError) {
      redirectedRef.current = false;
      return;
    }
    if (isAuthenticated) {
      redirectedRef.current = false;
      return;
    }
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    router.replace("/login");
  }, [authError, pathname, isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(async () => {
      try {
        await api.get("/api/auth/me");
      } catch (error) {
        if (error?.status === 401 || error?.status === 403) {
          await useAuthStore.getState().handleAuthFailure();
        }
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!pathname.startsWith("/dashboard")) return;
    if (!authError || isLoading || isAuthenticated) return;

    const retryTimer = setTimeout(() => {
      useAuthStore.getState().fetchUser({ retries: 0 });
    }, 3_000);

    return () => clearTimeout(retryTimer);
  }, [authError, isAuthenticated, isLoading, pathname]);

  return <>{children}</>;
}
