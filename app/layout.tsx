import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { QueryProvider } from "@/lib/providers/query-provider";
import { StoreProvider } from "@/lib/providers/store-provider";
import "./globals.css";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GymOS",
  description: "Manage your gym members, attendance, and payments",
  generator: "Next.js",
  manifest: "/manifest.json",
  keywords: ["gym", "management", "members", "attendance", "payments"],
  authors: [{ name: "Manisha Kanojia", url: "https://yourwebsite.com" }],
  icons: {
    icon: "icons/icon-192-192.png",
    apple: "icons/icon-192-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
            {children}
            <Toaster position="top-right" richColors />
          </QueryProvider>
        </StoreProvider>
      </body>
    </html>
  );
}