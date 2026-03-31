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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={bauhausFont.variable}>
      
      <body className={bauhausFont.className}>
       <ErrorBoundary>
         <QueryProvider>
           <AuthProvider>
             <TooltipProvider>{children}</TooltipProvider>
             <Toaster position="top-right" />     
           </AuthProvider>
         </QueryProvider>
       </ErrorBoundary>
      </body>
    </html>
  );
}