import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fontFamily, radii, spacing } from "@/theme";
import { supabase } from "@/lib/supabase";
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
} from "@propian/shared/hooks";
import { FilterChip, EmptyState, Skeleton, Avatar } from "@/components/ui";
import { IconBell } from "@/components/icons/IconBell";
import { IconHeart } from "@/components/icons/IconHeart";
import { IconComment } from "@/components/icons/IconComment";
import { IconRepost } from "@/components/icons/IconRepost";
import { IconUser } from "@/components/icons/IconUser";
import { IconFlag } from "@/components/icons/IconFlag";
import { IconChevLeft } from "@/components/icons/IconChevLeft";
import { timeAgo } from "@propian/shared/utils";
import type { Notification, NotificationType } from "@propian/shared/types";

type FilterType = "all" | "mention" | "like" | "comment" | "follow";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mention", label: "Mentions" },
  { key: "like", label: "Likes" },
  { key: "comment", label: "Comments" },
  { key: "follow", label: "Follows" },
];

const TYPE_BADGE_COLORS: Record<NotificationType, string> = {
  mention: colors.blue,
  like: colors.red,
  follow: colors.lime,
  comment: colors.blue,
  repost: colors.lime,
  system: colors.g500,
};

function getNotificationBadgeIcon(type: NotificationType) {
  const size = 10;
  const color = "#fff";
  switch (type) {
    case "like":
      return <IconHeart size={size} color={color} />;
    case "comment":
    case "mention":
      return <IconComment size={size} color={color} />;
    case "follow":
      return <IconUser size={size} color={color} />;
    case "repost":
      return <IconRepost size={size} color={color} />;
    case "system":
      return <IconFlag size={size} color={color} />;
    default:
      return <IconBell size={size} color={color} />;
  }
}

function getFallbackIcon(type: NotificationType) {
  switch (type) {
    case "like":
      return <IconHeart size={18} color={colors.red} />;
    case "comment":
    case "mention":
      return <IconComment size={18} color={colors.blue} />;
    case "follow":
      return <IconUser size={18} color={colors.lime} />;
    case "repost":
      return <IconRepost size={18} color={colors.black} />;
    case "system":
      return <IconFlag size={18} color={colors.g500} />;
    default:
      return <IconBell size={18} color={colors.g500} />;
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filterType, setFilterType] = useState<FilterType>("all");
  const { data: notifications, isLoading, unreadCount } = useNotifications(supabase);
  const markRead = useMarkRead(supabase);
  const markAllRead = useMarkAllRead(supabase);

  const filteredNotifications = (notifications ?? []).filter(
    (n: Notification) => {
      if (filterType === "all") return true;
      return n.type === filterType;
    }
  );

  const handleNotificationPress = useCallback(
    (notification: Notification) => {
      // Mark as read
      if (!notification.is_read) {
        markRead.mutate(notification.id);
      }

      // Deep-link based on notification data
      const data = notification.data as Record<string, string>;

      if (data?.post_id) {
        router.push({ pathname: "/post/[id]", params: { id: data.post_id } });
      } else if (notification.type === "follow" && data?.actor_username) {
        router.push({
          pathname: "/profile/[username]",
          params: { username: data.actor_username },
        });
      }
    },
    [markRead, router]
  );

  const renderNotification = useCallback(
    ({ item }: { item: Notification }) => {
      const data = item.data as Record<string, string>;
      const actorName = data?.actor_display_name || data?.actor_username || "";
      const actorAvatar = data?.actor_avatar_url || null;
      const badgeColor = TYPE_BADGE_COLORS[item.type] || colors.g400;

      return (
        <Pressable
          style={[styles.notifItem, !item.is_read && styles.notifUnread]}
          onPress={() => handleNotificationPress(item)}
        >
          {/* Avatar with type badge */}
          <View style={styles.avatarWrap}>
            {actorAvatar ? (
              <Avatar src={actorAvatar} name={actorName} size="sm" />
            ) : (
              <View style={styles.notifIconContainer}>
                {getFallbackIcon(item.type)}
              </View>
            )}
            {actorAvatar && (
              <View style={[styles.typeBadge, { backgroundColor: badgeColor }]}>
                {getNotificationBadgeIcon(item.type)}
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.notifContent}>
            <Text style={styles.notifTitle}>{item.title}</Text>
            {item.body && (
              <Text style={styles.notifBody} numberOfLines={2}>
                {item.body}
              </Text>
            )}
            <Text style={styles.notifTime}>{timeAgo(item.created_at)}</Text>
          </View>

          {/* Unread dot */}
          {!item.is_read && <View style={styles.unreadDot} />}
        </Pressable>
      );
    },
    [handleNotificationPress]
  );

  if (isLoading) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconChevLeft size={20} color={colors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={36} height={36} radius={18} />
              <View style={styles.skeletonText}>
                <Skeleton width={180} height={14} />
                <Skeleton width={250} height={12} />
                <Skeleton width={80} height={10} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <IconChevLeft size={20} color={colors.black} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Notifications</Text>
              <Pressable
                style={[
                  styles.markAllButton,
                  (unreadCount === 0 || markAllRead.isPending) && styles.markAllButtonDisabled,
                ]}
                onPress={() => markAllRead.mutate()}
                disabled={markAllRead.isPending || unreadCount === 0}
              >
                <Text
                  style={[
                    styles.markAllText,
                    (unreadCount === 0 || markAllRead.isPending) && styles.markAllTextDisabled,
                  ]}
                >
                  Mark All Read
                </Text>
              </Pressable>
            </View>

            {/* Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {FILTERS.map((f) => (
                <FilterChip
                  key={f.key}
                  label={f.label}
                  active={filterType === f.key}
                  onPress={() => setFilterType(f.key)}
                />
              ))}
            </ScrollView>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<IconBell size={40} color={colors.g300} />}
            title="No notifications"
            description={
              filterType === "all"
                ? "You're all caught up!"
                : `No ${filterType} notifications yet.`
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.g200,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: fontFamily.sans.bold,
    fontSize: 18,
    color: colors.black,
  },
  markAllButton: {
    backgroundColor: colors.lime,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.black,
  },
  markAllText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 9,
    color: colors.black,
  },
  markAllButtonDisabled: {
    backgroundColor: colors.g100,
    borderColor: colors.g200,
    opacity: 0.6,
  },
  markAllTextDisabled: {
    color: colors.g400,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  listContent: {
    paddingBottom: 100,
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  notifUnread: {
    backgroundColor: colors.lime10,
  },
  avatarWrap: {
    position: "relative",
  },
  notifIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.g100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.g200,
  },
  typeBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: colors.black,
    marginBottom: 2,
  },
  notifBody: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g600,
    lineHeight: 18,
    marginBottom: 4,
  },
  notifTime: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: colors.g400,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lime,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.black,
  },
  loadingContainer: {
    padding: spacing.base,
    gap: 16,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  skeletonText: {
    gap: 6,
    flex: 1,
  },
});
