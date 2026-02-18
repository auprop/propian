"use client";

import { useState } from "react";
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
} from "@propian/shared/hooks";
import type { Notification, NotificationType } from "@propian/shared/types";
import { timeAgo } from "@propian/shared/utils";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { FilterChip } from "@/components/ui/FilterChip";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

type FilterTab = "all" | NotificationType;

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: "All", value: "all" },
  { label: "Mentions", value: "mention" },
  { label: "Likes", value: "like" },
  { label: "Follows", value: "follow" },
  { label: "Reviews", value: "review" },
];

const NOTIF_ICONS: Record<NotificationType, string> = {
  mention: "@",
  like: "\u2665",
  follow: "\u271A",
  comment: "\u{1F4AC}",
  review: "\u2605",
  system: "\u26A0",
};

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const icon = NOTIF_ICONS[notification.type] ?? "\u2022";

  return (
    <div
      className={`pt-notif ${notification.is_read ? "" : "unread"}`}
      onClick={() => {
        if (!notification.is_read) {
          onMarkRead(notification.id);
        }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !notification.is_read) {
          onMarkRead(notification.id);
        }
      }}
    >
      <div className={`pt-notif-icon pt-notif-icon-${notification.type}`}>
        {icon}
      </div>
      <div className="pt-notif-content">
        <div className="pt-notif-title">{notification.title}</div>
        {notification.body && (
          <div className="pt-notif-body">{notification.body}</div>
        )}
        <div className="pt-notif-time">{timeAgo(notification.created_at)}</div>
      </div>
      {!notification.is_read && <div className="pt-notif-dot" />}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="pt-col" style={{ gap: 8 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} width="100%" height={72} borderRadius={12} />
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const supabase = createBrowserClient();
  const { data: notifications, isLoading } = useNotifications(supabase);
  const markRead = useMarkRead(supabase);
  const markAllRead = useMarkAllRead(supabase);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const filtered =
    activeTab === "all"
      ? notifications
      : notifications?.filter((n: Notification) => n.type === activeTab);

  const hasUnread = notifications?.some((n: Notification) => !n.is_read);

  return (
    <div className="pt-container">
      <div className="pt-page-header">
        <h1 className="pt-page-title">Notifications</h1>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            {markAllRead.isPending ? "Marking..." : "Mark All Read"}
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="pt-filter-bar">
        {FILTER_TABS.map((tab) => (
          <FilterChip
            key={tab.value}
            label={tab.label}
            active={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
          />
        ))}
      </div>

      {/* Notification list */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : !filtered?.length ? (
        <EmptyState
          title="No notifications"
          description={
            activeTab === "all"
              ? "You're all caught up! New notifications will appear here."
              : `No ${activeTab} notifications yet.`
          }
        />
      ) : (
        <div className="pt-notif-list">
          {filtered.map((notification: Notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={(id) => markRead.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
