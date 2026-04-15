import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { QueryProvider } from "@/lib/providers/query-provider";
import { StoreProvider } from "@/lib/providers/store-provider";
import { PWARegister } from "@/components/pwa-register";
import "./globals.css";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gym Management System",
  description: "Manage your gym members, attendance, and payments",
  manifest: "/manifest.webmanifest",
  applicationName: "Gym Management System",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gym Management System",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${nunitoSans.variable} antialiased`}
        style={{ fontFamily: "var(--font-nunito-sans), sans-serif" }}
      >
        <StoreProvider>
          <QueryProvider>
            <PWARegister />
            {children}
            <Toaster position="top-right" richColors />
          </QueryProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
