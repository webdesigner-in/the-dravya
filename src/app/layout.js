import localFont from "next/font/local"
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/ErrorBoundary";


const bauhausFont = localFont({
  src: '../assets/font/BauhausStd-Medium.ttf',
  display: 'swap',
  variable: '--font-bauhaus',
  preload: true,
  fallback: ['system-ui', 'arial'],
  adjustFontFallback: 'Arial',
});


export const metadata = {
  title: "The Dravya | Water Business Management System",
  description: "Manage Money, Stock , Distribution From a single Application",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={bauhausFont.variable}>
      <body
        className={`${bauhausFont.className} min-h-dvh overflow-x-hidden antialiased`}
      >
        <ErrorBoundary>
          <QueryProvider>
            <AuthProvider>
              <TooltipProvider>{children}</TooltipProvider>
              <Toaster
                position="top-right"
                className="!top-[max(0.5rem,env(safe-area-inset-top))] !right-[max(0.5rem,env(safe-area-inset-right))]"
                toastOptions={{ className: "text-sm max-w-[min(20rem,calc(100vw-1.5rem))]" }}
              />
            </AuthProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}