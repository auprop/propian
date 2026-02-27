"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
} from "@propian/shared/hooks";
import type { Notification, NotificationType } from "@propian/shared/types";
import { timeAgo } from "@propian/shared/utils";
import {
  IconHeart,
  IconComment,
  IconRepost,
  IconUser,
} from "@propian/shared/icons";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { FilterChip } from "@/components/ui/FilterChip";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

type FilterTab = "all" | NotificationType;

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: "All", value: "all" },
  { label: "Mentions", value: "mention" },
  { label: "Likes", value: "like" },
  { label: "Comments", value: "comment" },
  { label: "Follows", value: "follow" },
];

const TYPE_BADGE_COLORS: Record<NotificationType, string> = {
  mention: "var(--blue)",
  like: "var(--red)",
  follow: "var(--green)",
  comment: "var(--blue)",
  repost: "var(--lime)",
  system: "var(--g600)",
};

function TypeBadgeIcon({ type }: { type: NotificationType }) {
  const size = 12;
  const color = "#fff";

  switch (type) {
    case "like":
      return <IconHeart size={size} color={color} />;
    case "comment":
      return <IconComment size={size} color={color} />;
    case "repost":
      return <IconRepost size={size} color={color} />;
    case "follow":
      return <IconUser size={size} color={color} />;
    case "mention":
      return <span style={{ fontSize: 10, fontWeight: 700, color }}>@</span>;
    case "system":
      return <span style={{ fontSize: 10, color }}>!</span>;
    default:
      return null;
  }
}

function NotificationItem({
  notification,
  onPress,
}: {
  notification: Notification;
  onPress: (n: Notification) => void;
}) {
  const data = notification.data as Record<string, string>;
  const actorName = data?.actor_display_name || data?.actor_username || "";
  const actorAvatar = data?.actor_avatar_url || null;
  const badgeColor = TYPE_BADGE_COLORS[notification.type] || "var(--g400)";

  return (
    <div
      className={`pt-notif ${notification.is_read ? "" : "unread"}`}
      onClick={() => onPress(notification)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onPress(notification);
      }}
    >
      {/* Avatar with type badge */}
      <div className="pt-notif-avatar-wrap">
        {actorAvatar ? (
          <Avatar src={actorAvatar} name={actorName} size="sm" />
        ) : (
          <div className={`pt-notif-icon pt-notif-icon-${notification.type}`}>
            <TypeBadgeIcon type={notification.type} />
          </div>
        )}
        {actorAvatar && (
          <div
            className="pt-notif-type-badge"
            style={{ background: badgeColor }}
          >
            <TypeBadgeIcon type={notification.type} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pt-notif-content">
        <div className="pt-notif-title">{notification.title}</div>
        {notification.body && (
          <div className="pt-notif-body">{notification.body}</div>
        )}
        <div className="pt-notif-time">{timeAgo(notification.created_at)}</div>
      </div>

      {/* Unread dot */}
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
  const router = useRouter();
  const { data: notifications, isLoading } = useNotifications(supabase);
  const markRead = useMarkRead(supabase);
  const markAllRead = useMarkAllRead(supabase);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const filtered =
    activeTab === "all"
      ? notifications
      : notifications?.filter((n: Notification) => n.type === activeTab);

  const hasUnread = notifications?.some((n: Notification) => !n.is_read);

  const handleNotificationPress = useCallback(
    (notification: Notification) => {
      // Mark as read
      if (!notification.is_read) {
        markRead.mutate(notification.id);
      }

      // Deep-link based on notification data
      const data = notification.data as Record<string, string>;

      if (data?.post_id) {
        router.push(`/post/${data.post_id}`);
      } else if (notification.type === "follow" && data?.actor_username) {
        router.push(`/profile/${data.actor_username}`);
      }
    },
    [markRead, router]
  );

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
              onPress={handleNotificationPress}
            />
          ))}
        </div>
      )}
    </div>
  );
}
