"use client";
import Link from "next/link";
import { Button } from "../ui/button";
import { LogInIcon, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export default function Navbar() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isTokenExpired = useAuthStore((state) => state.isTokenExpired);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  // Check token expiration on mount and periodically
  useEffect(() => {
    const checkTokenExpiration = () => {
      if (isAuthenticated && isTokenExpired()) {
        toast.error("Your session has expired. Please login again.");
        logout();
        router.push("/login");
      }
    };

    checkTokenExpiration();
    const interval = setInterval(checkTokenExpiration, 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isTokenExpired, logout, router]);

  const showLoginButton = !isAuthenticated || isTokenExpired();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-4 z-50 w-full flex justify-center px-4 mb-8">
      <nav
        className="w-full max-w-6xl flex items-center justify-between px-6 py-3 rounded-xl 
        bg-white/70 backdrop-blur-xl 
        border border-gray-200/60 
        shadow-lg 
        transition-all duration-300 hover:shadow-xl"
      >
        {/* Brand */}
        <div className="flex items-center">
          <Link href={"/"} className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-wide text-gray-900">
              Dravya
            </h1>
          </Link>
        </div>

        {/* Actions */}
        {!showLoginButton && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar>
                  <AvatarFallback className="bg-gray-900 text-white">
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground capitalize mt-1">
                    Role: {user.role}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <Link href="/dashboard">
                  <DropdownMenuItem>Dashboard</DropdownMenuItem>
                </Link>
                <Link href="/profile">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center">
            <Link href="/login">
              <Button
                variant="secondary"
                className="flex items-center gap-2 rounded-lg 
              bg-gray-900 text-white 
              hover:bg-gray-800 
              shadow-md transition-all duration-300 px-5 py-2"
              >
                <LogInIcon size={18} />
                <span className="font-medium">Login</span>
              </Button>
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
