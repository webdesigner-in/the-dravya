import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";

export default function DashboardLayout({ children }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 min-h-14 shrink-0 items-center gap-2 border-b px-2 sm:px-3 md:h-16 md:min-h-16 md:px-5 md:gap-3">
          <SidebarTrigger className="-ml-0.5 shrink-0 md:-ml-1" />
        </header>
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-2 py-3 sm:px-3 sm:py-4 md:px-5 md:py-5 lg:px-6 lg:py-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
