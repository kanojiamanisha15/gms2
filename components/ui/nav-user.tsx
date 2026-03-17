"use client";

import Link from "next/link";
import {
  MoreVertical,
  LogOut,
  BellRing,
  UserCircle,
  SquareUserRound,
} from "lucide-react";

import { useLogout } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const { isMobile, setOpenMobile } = useSidebar();

  const closeSidebar = () => {
    // On mobile, also close the sidebar sheet when navigating.
    if (isMobile) {
      setOpenMobile(false);
    }
    // On desktop/tablet, keep the sidebar open and let only the dropdown close.
  };
  const {
    mutate: logout,
    isPending,
    isError,
    error,
  } = useLogout();
  const handleLogout = () => {
    logout();
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground shadow-sm">
                <SquareUserRound className="h-5 w-5" aria-hidden />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </div>
              <MoreVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
                  <SquareUserRound className="h-5 w-5" aria-hidden />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup className="flex flex-col gap-2 p-2 text-sm">
              <button onClick={closeSidebar}>
                <Link href="/account" className="flex items-center gap-2">
                  <UserCircle className="!size-4"/>
                  Account
                </Link>
              </button>
              <button onClick={closeSidebar}>
                <Link href="/notifications" className="flex items-center gap-2">
                  <BellRing className="!size-4"/>
                  Notifications
                </Link>
              </button>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className={isPending ? "pointer-events-none opacity-70" : ""}
            >
              <LogOut />
              {isPending ? "Logging out..." : "Log out"}
            </DropdownMenuItem>
            {isError && (
              <DropdownMenuItem className="text-destructive pointer-events-none">
                {error instanceof Error ? error.message : "Logout failed"}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
