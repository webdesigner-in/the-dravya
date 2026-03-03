import { Patrick_Hand } from "next/font/google"
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/ErrorBoundary";


const patrickHand = Patrick_Hand({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-patrick-hand',
});


export const metadata = {
  title: "The Dravya | Water Business Management System",
  description: "Manage Money, Stock , Distribution From a single Application",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={patrickHand.variable}>
      
      <body className={patrickHand.className}>
       <ErrorBoundary>
         <AuthProvider>
           <TooltipProvider>{children}</TooltipProvider>
           <Toaster position="top-right" />
         </AuthProvider>
       </ErrorBoundary>
      </body>
    </html>
  );
}
