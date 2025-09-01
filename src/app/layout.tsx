import { ToastProvider } from "@/components/ui/toast";
import { MotionProvider } from "@/lib/motion/provider";
import { AuthProvider } from "@/lib/auth-context";
import { TRPCReactProvider } from "@/trpc/client";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ALL IN",
  description: "ALL IN",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-900`}
      >
        <AuthProvider>
          <ToastProvider>
            <MotionProvider>
              <TRPCReactProvider>{children}</TRPCReactProvider>
            </MotionProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
