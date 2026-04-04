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

export default function Navbar() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const showLoginButton = !isAuthenticated;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky z-50 w-full flex justify-center mb-4 md:mb-8 pt-[max(0.25rem,env(safe-area-inset-top))] px-0 sm:px-2">
      <nav
        className="w-full max-w-6xl flex min-w-0 items-center justify-between gap-2 rounded-lg md:rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3
        bg-white/70 backdrop-blur-xl
        border border-gray-200/60
        shadow-md md:shadow-lg
        transition-all duration-300 md:hover:shadow-xl"
      >
        {/* Brand */}
        <div className="flex min-w-0 items-center shrink">
          <Link href={"/"} className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-lg sm:text-xl md:text-2xl font-bold tracking-wide text-gray-900">
              Dravya
            </h1>
          </Link>
        </div>

        {/* Actions */}
        {!showLoginButton && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 shrink-0 rounded-full sm:h-10 sm:w-10">
                <Avatar>
                  <AvatarFallback className="bg-gray-900 text-white">
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[min(14rem,calc(100vw-1.5rem))] sm:w-56"
            >
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
          <div className="flex shrink-0 items-center">
            <Link href="/login" className="min-w-0">
              <Button
                variant="secondary"
                size="sm"
                className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-white shadow-md transition-all hover:bg-gray-800 sm:gap-2 sm:px-4 md:px-5"
              >
                <LogInIcon className="size-4 shrink-0 sm:size-[18px]" />
                <span className="font-medium text-sm sm:text-base">Login</span>
              </Button>
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
