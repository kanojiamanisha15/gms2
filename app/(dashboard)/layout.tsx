"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { SiteHeader } from "@/components/ui/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useCurrentUser } from "@/hooks/use-auth";
import { PageLoader } from "@/components/ui/page-loader";
import {
  canAccessPathname,
  getFirstAccessibleHref,
} from "@/lib/route-access";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, isLoading, isError, isFetched } = useCurrentUser();

  useEffect(() => {
    if (isFetched && (isError || !user)) {
      router.replace("/login");
    }
  }, [isFetched, isError, user, router]);

  useEffect(() => {
    if (!user) return;
    if (!canAccessPathname(pathname, user)) {
      router.replace(getFirstAccessibleHref(user));
    }
  }, [pathname, user, router]);

  if (isLoading) {
    return <PageLoader message="Loading..." />;
  }

  if (isFetched && (isError || !user)) {
    return null;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar user={user} variant="inset" />
      <SidebarInset>
        <SiteHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
