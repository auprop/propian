import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { colors, fontFamily, radii, spacing } from "@/theme";
import { supabase } from "@/lib/supabase";
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
} from "@propian/shared/hooks";
import { FilterChip, EmptyState, Skeleton } from "@/components/ui";
import { IconBell } from "@/components/icons/IconBell";
import { IconHeart } from "@/components/icons/IconHeart";
import { IconComment } from "@/components/icons/IconComment";
import { IconUser } from "@/components/icons/IconUser";
import { IconStar } from "@/components/icons/IconStar";
import { IconFlag } from "@/components/icons/IconFlag";
import { IconArrow } from "@/components/icons/IconArrow";
import { timeAgo } from "@propian/shared/utils";
import type { Notification, NotificationType } from "@propian/shared/types";

type FilterType = "all" | "mention" | "like" | "follow" | "review";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mention", label: "Mentions" },
  { key: "like", label: "Likes" },
  { key: "follow", label: "Follows" },
  { key: "review", label: "Reviews" },
];

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "like":
      return <IconHeart size={18} color={colors.red} />;
    case "comment":
    case "mention":
      return <IconComment size={18} color={colors.blue} />;
    case "follow":
      return <IconUser size={18} color={colors.lime} />;
    case "review":
      return <IconStar size={18} color={colors.amber} />;
    case "system":
      return <IconFlag size={18} color={colors.g500} />;
    default:
      return <IconBell size={18} color={colors.g500} />;
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
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
      if (!notification.is_read) {
        markRead.mutate(notification.id);
      }
    },
    [markRead]
  );

  const renderNotification = useCallback(
    ({ item }: { item: Notification }) => (
      <Pressable
        style={[styles.notifItem, !item.is_read && styles.notifUnread]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notifIconContainer}>
          {getNotificationIcon(item.type)}
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle}>{item.title}</Text>
          {item.body && (
            <Text style={styles.notifBody} numberOfLines={2}>
              {item.body}
            </Text>
          )}
          <Text style={styles.notifTime}>{timeAgo(item.created_at)}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </Pressable>
    ),
    [handleNotificationPress]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={() => router.back()}>
                <IconArrow size={20} color={colors.black} />
              </Pressable>
              <Text style={styles.headerTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <Pressable
                  style={styles.markAllButton}
                  onPress={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                >
                  <Text style={styles.markAllText}>Mark All Read</Text>
                </Pressable>
              )}
            </View>

            {/* Filter Chips */}
            <View style={styles.chipRow}>
              {FILTERS.map((f) => (
                <FilterChip
                  key={f.key}
                  label={f.label}
                  active={filterType === f.key}
                  onPress={() => setFilterType(f.key)}
                />
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<IconBell size={40} color={colors.g300} />}
            title="No notifications"
            description="You're all caught up!"
          />
        }
      />
    </SafeAreaView>
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
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 24,
    color: colors.black,
    letterSpacing: -0.5,
    flex: 1,
    marginLeft: 12,
  },
  markAllButton: {
    backgroundColor: colors.lime,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.black,
  },
  markAllText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: colors.black,
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
