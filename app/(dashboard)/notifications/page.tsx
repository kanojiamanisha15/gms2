"use client";

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
import { ErrorMessage } from "@/components/ui/error-message";
import {
  Bell,
  Check,
  Loader2,
  X,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentLoader } from "@/components/ui/content-loader";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";

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

function NotificationRowSkeleton({
  className,
  footerClassName,
  showMarkAction = true,
}: {
  className: string;
  footerClassName: string;
  showMarkAction?: boolean;
}) {
  return (
    <div className={className}>
      <div className="mt-0.5">
        <Skeleton className="h-5 w-5" />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2 w-full">
          <div className="w-full">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-20 shrink-0" />
            </div>
            <Skeleton className="h-4 w-full mt-1" />
          </div>
        </div>
        <div className={footerClassName}>
          <Skeleton className="h-3 w-24" />
          <div className="flex items-center gap-2">
            {showMarkAction ? <Skeleton className="h-8 w-32 rounded-md" /> : null}
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { hasPermission } = usePermissions();
  const { data: notifications = [], isLoading, isError, error } = useNotifications();
  const {
    mutateAsync: markNotificationRead,
    isPending: isMarkNotificationReadPending,
    error: markNotificationReadError,
    variables: markNotificationReadVariables,
  } = useMarkNotificationRead();

  const {
    mutateAsync: markAllNotificationsRead,
    isPending: isMarkAllNotificationsReadPending,
    error: markAllNotificationsReadError,
  } = useMarkAllNotificationsRead();

  const {
    mutateAsync: deleteNotificationById,
    isPending: isDeleteNotificationPending,
    error: deleteNotificationError,
    variables: deleteNotificationVariables,
  } = useDeleteNotification();

  const unreadCount = notifications.filter((n) => !n.read).length;
  const actionError =
    markNotificationReadError ||
    markAllNotificationsReadError ||
    deleteNotificationError;

  const isMarkingReadForNotification = (notificationId: string) =>
    isMarkNotificationReadPending &&
    (markNotificationReadVariables as string | undefined) === notificationId;

  const isDeletingForNotification = (notificationId: string) =>
    isDeleteNotificationPending &&
    (deleteNotificationVariables as string | undefined) === notificationId;

  const isNotificationActionLoading = (notificationId: string) =>
    isMarkingReadForNotification(notificationId) || isDeletingForNotification(notificationId);


  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);

  return (
    <PageContent
      title="Notifications"
      description="Stay updated with important alerts and updates"
      headerAction={
        hasPermission(PERMISSIONS.NOTIFICATIONS_MARK_ALL_AS_READ) && unreadCount > 0 ? (
          <Button
            variant="outline"
            onClick={() => markAllNotificationsRead()}
            disabled={isMarkAllNotificationsReadPending}
          >
            {isMarkAllNotificationsReadPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Mark all as read
          </Button>
        ) : null
      }
    >
      <div className="px-4 lg:px-6 space-y-6">
        <ErrorMessage
          error={actionError}
          fallback="Action failed"
        />
        {isLoading ? (
          <ContentLoader message="Loading notifications..." />
        ) : isError ? (
          <ErrorMessage
            error={error}
            fallback="Failed to load notifications"
          />
        ) :
          (<>
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
                      isNotificationActionLoading(notification.id) ? (
                        <NotificationRowSkeleton
                          key={notification.id}
                          className="flex w-full items-start gap-4 p-4 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
                          footerClassName="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2"
                          showMarkAction
                        />
                      ) : (
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
                                  <h4 className="font-semibold text-sm">{notification.title}</h4>
                                  <Badge
                                    variant={getNotificationBadgeVariant(notification.type)}
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
                              {hasPermission(PERMISSIONS.NOTIFICATIONS_MARK_AS_READ) || hasPermission(PERMISSIONS.NOTIFICATIONS_DELETE) ? (
                                <div className="flex items-center gap-2">
                                  {hasPermission(PERMISSIONS.NOTIFICATIONS_MARK_AS_READ) ? (
                                    <Button
                                      className=" !sm:px-3 !px-0 mr-2"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => markNotificationRead(notification.id)}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Mark as read
                                    </Button>
                                  ) : null}
                                  {hasPermission(PERMISSIONS.NOTIFICATIONS_DELETE) ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteNotificationById(notification.id)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
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
                        isNotificationActionLoading(notification.id) ? (
                          <NotificationRowSkeleton
                            key={notification.id}
                            className="flex items-start gap-4 p-4 rounded-lg border opacity-75 hover:opacity-100 transition-opacity"
                            footerClassName="flex items-center justify-between mt-2"
                            showMarkAction={false}
                          />
                        ) : (
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
                                  variant={getNotificationBadgeVariant(notification.type)}
                                  className="shrink-0"
                                >
                                  {notification.type}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-muted-foreground">
                                  {dayjs(notification.createdAt).fromNow()}
                                </span>
                                {hasPermission(PERMISSIONS.NOTIFICATIONS_DELETE) ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteNotificationById(notification.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No read notifications
                    </div>
                  )}
                </CardContent>
              </Card>
            </>)}


      </div>
    </PageContent>
  );
}
