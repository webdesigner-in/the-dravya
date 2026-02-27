"use client";

import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function AuthProvider({ children }) {
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const isLoading = useAuthStore((state) => state.isLoading);
  const pathname = usePathname();

  useEffect(() => {
    // Only fetch user if not already loaded and not on public pages
    const isPublicPage = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register');
    
    if (!isPublicPage) {
      fetchUser();
    } else {
      // Set loading to false on public pages
      useAuthStore.setState({ isLoading: false });
    }
  }, [fetchUser, pathname]);

  // Show loading state only on protected routes
  if (isLoading && !pathname.startsWith('/login') && !pathname.startsWith('/register') && pathname !== '/') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <>{children}</>;
}
