"use client";

import * as React from "react";
import { PageContent } from "@/components/ui/page-content";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "@/hooks/use-notifications";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Check,
  X,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

type Notification = {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
};

const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "success":
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    case "error":
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    case "info":
    default:
      return <Info className="h-5 w-5 text-blue-600" />;
  }
};

const getNotificationBadgeVariant = (
  type: Notification["type"]
): "default" | "secondary" | "destructive" | "outline" => {
  switch (type) {
    case "success":
      return "default";
    case "warning":
      return "secondary";
    case "error":
      return "destructive";
    case "info":
    default:
      return "outline";
  }
};

export default function NotificationsPage() {
  const { data: notifications = [], isLoading, isError, error } = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const deleteMutation = useDeleteNotification();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    markReadMutation.mutate(id);
  };

  const markAllAsRead = () => {
    markAllReadMutation.mutate();
  };

  const deleteNotification = (id: string) => {
    deleteMutation.mutate(id);
  };

  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);

  return (
    <PageContent
      title="Notifications"
      description="Stay updated with important alerts and updates"
      headerAction={
        unreadCount > 0 ? (
          <Button
            variant="outline"
            onClick={() => markAllAsRead()}
            disabled={markAllReadMutation.isPending}
          >
            <Check className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        ) : null
      }
    >
      <div className="px-4 lg:px-6 space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading notifications...</p>
        ) : isError ? (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load notifications"}
          </p>
        ) :
          unreadCount > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      <CardTitle>Unread Notifications</CardTitle>
                      <Badge variant="destructive">{unreadCount}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 w-full">
                    {unreadNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="flex w-full items-start gap-4 p-4 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2 w-full">
                            <div className="w-full">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-semibold text-sm">
                                  {notification.title}
                                </h4>
                                <Badge
                                  variant={getNotificationBadgeVariant(
                                    notification.type
                                  )}
                                  className="shrink-0"
                                >
                                  {notification.type}
                                </Badge>
                              </div>

                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                            </div>

                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {dayjs(notification.createdAt).fromNow()}
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                className=" !sm:px-3 !px-0 mr-2"
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Mark as read
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteNotification(notification.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {unreadCount > 0 ? "Read Notifications" : "All Notifications"}
                  </CardTitle>
                  <CardDescription>
                    {readNotifications.length} notification
                    {readNotifications.length !== 1 ? "s" : ""} read
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {readNotifications.length > 0 ? (
                    <div className="space-y-3">
                      {readNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="flex items-start gap-4 p-4 rounded-lg border opacity-75 hover:opacity-100 transition-opacity"
                        >
                          <div className="mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-semibold text-sm">
                                  {notification.title}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {notification.message}
                                </p>
                              </div>
                              <Badge
                                variant={getNotificationBadgeVariant(
                                  notification.type
                                )}
                                className="shrink-0"
                              >
                                {notification.type}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">
                                {dayjs(notification.createdAt).fromNow()}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteNotification(notification.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No read notifications
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}


      </div>
    </PageContent>
  );
}
