"use client";

import Link from "next/link";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/use-notifications";
import { useCurrentUser } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ErrorMessage } from "@/components/ui/error-message";

dayjs.extend(relativeTime);

export function SiteHeader() {
  const { data: currentUser } = useCurrentUser();
  const {
    data: notifications = [],
    isLoading,
    isError,
    error: notificationsError,
  } = useNotifications();
  const { hasPermission } = usePermissions();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter((n) => !n.read).length;
  const recentNotifications = notifications.slice(0, 3);
  const gymName = currentUser?.gymName?.trim();
  const showGymWelcome = Boolean(currentUser?.gymId && gymName);

  const handleNotificationClick = (id: string, read: boolean) => {
    if (!read && hasPermission(PERMISSIONS.NOTIFICATIONS_MARK_AS_READ)) {
      markReadMutation.mutate(id);
    }
  };

  const handleMarkAllRead = () => {
    if (unreadCount > 0 && hasPermission(PERMISSIONS.NOTIFICATIONS_MARK_ALL_AS_READ)) {
      markAllReadMutation.mutate();
    }
  };

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        {showGymWelcome ? (
          <div className="hidden md:flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
            <p className="text-xs text-muted-foreground">
              Welcome to <span className="font-semibold text-foreground">{gymName}</span>
            </p>
          </div>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            {hasPermission(PERMISSIONS.NOTIFICATIONS_READ) ? <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground leading-none ring-2 ring-background">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>:null}
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                {hasPermission(PERMISSIONS.NOTIFICATIONS_MARK_ALL_AS_READ) && unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMarkAllRead();
                    }}
                    disabled={markAllReadMutation.isPending}
                  >
                    {markAllReadMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Mark all read
                      </>
                    )}
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading notifications...
                </div>
              ) : isError ? (
                <ErrorMessage
                  error={notificationsError}
                  fallback="Failed to load notifications"
                  className="p-4 text-center"
                />
              ) : recentNotifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {recentNotifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      asChild
                      className={cn(
                        "flex flex-col items-start gap-1 p-3 cursor-pointer",
                        !notification.read && "bg-accent"
                      )}
                    >
                      <Link
                        href="/notifications"
                        onClick={() =>
                          handleNotificationClick(notification.id, notification.read)
                        }
                        className="w-full"
                      >
                        <div className="flex w-full items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                          </div>
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {dayjs(notification.createdAt).fromNow()}
                        </p>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href="/notifications"
                  className="justify-center text-center cursor-pointer"
                >
                  View all notifications
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
