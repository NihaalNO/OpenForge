"use client";

import type { NotificationItem } from "@openforge/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingSkeleton, PageHeader } from "@/components/common/ui";
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "@/lib/api/notifications";

export function NotificationsCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    const response = await fetchNotifications();
    setNotifications(response.notifications);
  }

  useEffect(() => {
    load()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Notifications failed to load"))
      .finally(() => setIsLoading(false));
  }, []);

  async function markRead(id: string) {
    await markNotificationRead(id);
    setNotifications((items) =>
      items.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item))
    );
  }

  async function markAllRead() {
    await markAllNotificationsRead();
    const readAt = new Date().toISOString();
    setNotifications((items) => items.map((item) => ({ ...item, readAt })));
  }

  async function remove(id: string) {
    await deleteNotification(id);
    setNotifications((items) => items.filter((item) => item.id !== id));
  }

  if (isLoading) {
    return <LoadingSkeleton rows={3} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notifications"
        title="Notification center"
        description="Updates for GitHub syncs, workspace preparation, generated plans, and roadmap work."
        actions={
          <Button type="button" onClick={() => void markAllRead()}>
            Mark all as read
          </Button>
        }
      />

      {error ? <ErrorState message={error} /> : null}

      {notifications.length === 0 ? (
        <EmptyState title="No notifications yet" description="Useful updates will appear here after syncs, updates, and generated plans." />
      ) : (
        <Card className="space-y-3">
          {notifications.map((notification) => (
            <div key={notification.id} className="rounded-[24px] border border-border bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${notification.readAt ? "bg-border" : "bg-brand-violet"}`}
                      aria-hidden="true"
                    />
                    <p className="font-semibold">{notification.title}</p>
                    <Badge>{notification.readAt ? "Read" : "Unread"}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{notification.body}</p>
                  {notification.actionUrl ? (
                    <Link href={notification.actionUrl} className="mt-3 inline-flex text-sm font-medium text-brand-violet">
                      Open
                    </Link>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {!notification.readAt ? (
                    <Button type="button" onClick={() => void markRead(notification.id)}>
                      Read
                    </Button>
                  ) : null}
                  <Button type="button" onClick={() => void remove(notification.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

