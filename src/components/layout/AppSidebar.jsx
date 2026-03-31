"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Droplets,
  Package,
  Truck,
  Users,
  IndianRupee,
  FileText,
  Settings,
  BarChart3,
  ShoppingCart,
  Warehouse,
  MapPin,
  LogOut,
  Calculator,
  Zap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";

const menuItems = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Operations",
    items: [
      { title: "Orders", url: "/dashboard/orders", icon: ShoppingCart },
      { title: "Quick Order", url: "/dashboard/quick-order", icon: Zap },
    ],
  },
  {
    title: "Finance",
    items: [
      { title: "Invoices", url: "/dashboard/invoices", icon: FileText },
      { title: "Customer Ledger", url: "/dashboard/reports", icon: BarChart3 },
      { title: "Daily Summary", url: "/dashboard/daily-summary", icon: Calculator },
    ],
  },
  {
    title: "Management",
    items: [
      { title: "Customers", url: "/dashboard/customers", icon: Users },
      { title: "Settings", url: "/dashboard/settings", icon: Settings },
    ],
  },
];

const adminOnlyItems = [
  { title: "Stock Management", url: "/dashboard/stock", icon: Package },
  { title: "Warehouse", url: "/dashboard/warehouse", icon: Warehouse },
  { title: "Products", url: "/dashboard/products", icon: Droplets },
  { title: "Transport", url: "/dashboard/transport", icon: Truck },
  { title: "Routes", url: "/dashboard/routes", icon: MapPin },
  { title: "Transactions", url: "/dashboard/transactions", icon: IndianRupee },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
  { title: "User Management", url: "/dashboard/users", icon: Users },
];

export function AppSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const logout = useAuthStore((state) => state.logout);
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const router = useRouter();
  const sidebarContentRef = useRef(null);
  const { isMobile, setOpenMobile } = useSidebar();

  // Fetch user data on mount if not loaded
  useEffect(() => {
    if (!user) {
      fetchUser();
    }
  }, [user, fetchUser]);

  // Save and restore sidebar scroll position
  useEffect(() => {
    const sidebarContent = sidebarContentRef.current;
    if (!sidebarContent) return;

    // Restore scroll position on mount
    const savedScrollPosition = sessionStorage.getItem('sidebarScrollPosition');
    if (savedScrollPosition) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        sidebarContent.scrollTop = parseInt(savedScrollPosition);
      });
    }

    // Save scroll position on scroll with throttling
    let scrollTimeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        sessionStorage.setItem('sidebarScrollPosition', sidebarContent.scrollTop.toString());
      }, 100); // Throttle to 100ms
    };

    sidebarContent.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      sidebarContent.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Restore scroll position when pathname changes
  useEffect(() => {
    const sidebarContent = sidebarContentRef.current;
    if (!sidebarContent) return;

    const savedScrollPosition = sessionStorage.getItem('sidebarScrollPosition');
    if (savedScrollPosition) {
      const scrollTop = parseInt(savedScrollPosition);
      
      // Use requestAnimationFrame to ensure DOM is ready
      // This waits for the next paint cycle when the sidebar content is fully rendered
      requestAnimationFrame(() => {
        if (sidebarContent) {
          sidebarContent.scrollTop = scrollTop;
        }
      });
    }
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Close mobile sidebar when a link is clicked
  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 pb-3">
        <Link href="/" className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-wide py-1">
            Dravya
          </h1>
        </Link>
      </SidebarHeader>
      
      <Separator />
      
      <SidebarContent ref={sidebarContentRef} className="py-2">
        {menuItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                    >
                      <Link href={item.url} scroll={false} onClick={handleLinkClick}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        
        {/* Admin Only Section */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminOnlyItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                    >
                      <Link href={item.url} scroll={false} onClick={handleLinkClick}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar className="shrink-0">
              <AvatarFallback>
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium truncate">{user?.name || "User"}</span>
              <span className="text-xs text-muted-foreground truncate">
                {user?.role || "user"}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" title="Logout" onClick={handleLogout} className="shrink-0">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
