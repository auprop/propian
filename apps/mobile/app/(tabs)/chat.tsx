import { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, fontFamily, spacing, radii } from "@/theme";
import { supabase } from "@/lib/supabase";
import {
  useCommunities,
  useCommunityChannels,
  useCommunityCategories,
  useUnreadCountsMap,
} from "@propian/shared/hooks";
import { Skeleton } from "@/components/ui";
import { IconSearch } from "@/components/icons/IconSearch";
import { IconUsers } from "@/components/icons/IconUsers";
import type { ChatRoom, CommunityCategory } from "@propian/shared/types";
import Svg, { Line, Rect, Path, Polyline } from "react-native-svg";

/* ─── Inline Icons ─── */

function IcHash({ size = 16, color = colors.g400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Line x1="4" y1="9" x2="20" y2="9" />
      <Line x1="4" y1="15" x2="20" y2="15" />
      <Line x1="10" y1="3" x2="8" y2="21" />
      <Line x1="16" y1="3" x2="14" y2="21" />
    </Svg>
  );
}

function IcLock({ size = 16, color = colors.g400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Rect x="3" y="11" width="18" height="11" rx="2" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  );
}

function IcDown({ size = 10, color = colors.g400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round">
      <Polyline points="6,9 12,15 18,9" />
    </Svg>
  );
}

/* ─── Component ─── */

export default function ChatChannelsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: communities, isLoading } = useCommunities(supabase);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Use first community by default
  const community = communities?.[0];
  const communityId = community?.id ?? "";

  const { data: channels } = useCommunityChannels(supabase, communityId);
  const { data: categories } = useCommunityCategories(supabase, communityId);
  const { data: unreadCounts } = useUnreadCountsMap(supabase);

  // Sum all unread counts for the total badge
  const totalUnread = Object.values(unreadCounts).reduce((sum, v) => sum + v.count, 0);

  const handleChannelPress = useCallback(
    (channelId: string, channelName: string) => {
      router.push({
        pathname: "/chat-room/[roomId]",
        params: { roomId: channelId, channelName, communityId },
      });
    },
    [router, communityId]
  );

  const toggleGroup = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Group channels by category
  const grouped = new Map<string | null, ChatRoom[]>();
  channels?.forEach((ch: ChatRoom) => {
    const key = ch.category_id ?? null;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(ch);
  });

  const sortedCategories = [...(categories ?? [])].sort(
    (a: CommunityCategory, b: CommunityCategory) => a.position - b.position
  );
  const uncategorized = grouped.get(null) ?? [];

  if (isLoading) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.nav}>
          <Text style={styles.navTitle}>Traders Lounge</Text>
        </View>
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={36} height={36} radius={10} />
              <View style={styles.skeletonText}>
                <Skeleton width={140} height={14} />
                <Skeleton width={180} height={11} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* Nav Bar */}
      <View style={styles.nav}>
        <Text style={styles.navTitle}>{community?.name ?? "Traders Lounge"}</Text>
        {totalUnread > 0 && (
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>{totalUnread}</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => router.push({ pathname: "/chat-search", params: { communityId } })}
        >
          <IconSearch size={20} color={colors.g500} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => router.push({ pathname: "/chat-members", params: { communityId } })}
        >
          <IconUsers size={20} color={colors.g500} />
        </TouchableOpacity>
      </View>

      {/* Channel List */}
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Uncategorized */}
        {uncategorized.map((ch) => (
          <ChannelItem
            key={ch.id}
            channel={ch}
            unread={unreadCounts[ch.id]?.count ?? 0}
            onPress={() => handleChannelPress(ch.id, ch.name ?? "channel")}
          />
        ))}

        {/* Categorized */}
        {sortedCategories.map((cat: CommunityCategory) => {
          const catChannels = (grouped.get(cat.id) ?? []).sort(
            (a, b) => (a.position ?? 0) - (b.position ?? 0)
          );
          const isCollapsed = collapsed[cat.id];

          return (
            <View key={cat.id}>
              <Pressable style={styles.groupHeader} onPress={() => toggleGroup(cat.id)}>
                <View style={{ transform: [{ rotate: isCollapsed ? "-90deg" : "0deg" }] }}>
                  <IcDown size={10} color={colors.g400} />
                </View>
                <Text style={styles.groupName}>{cat.name}</Text>
              </Pressable>
              {!isCollapsed &&
                catChannels.map((ch) => (
                  <ChannelItem
                    key={ch.id}
                    channel={ch}
                    unread={unreadCounts[ch.id]?.count ?? 0}
                    onPress={() => handleChannelPress(ch.id, ch.name ?? "channel")}
                  />
                ))}
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

/* ─── Channel Item ─── */

function ChannelItem({
  channel,
  unread = 0,
  onPress,
}: {
  channel: ChatRoom;
  unread?: number;
  onPress: () => void;
}) {
  const isLocked = channel.permissions_override !== null && channel.permissions_override !== undefined;

  return (
    <Pressable
      style={({ pressed }) => [styles.ch, pressed && styles.chPressed]}
      onPress={onPress}
    >
      <View style={[styles.chIcon, unread > 0 && styles.chIconUnread]}>
        {isLocked ? (
          <IcLock size={16} color={unread > 0 ? colors.black : colors.g400} />
        ) : (
          <IcHash size={16} color={unread > 0 ? colors.black : colors.g400} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.chName, unread > 0 && styles.chNameUnread]}>
          {channel.name ?? "untitled"}
        </Text>
        <Text style={styles.chDesc} numberOfLines={1}>
          {channel.description ?? ""}
        </Text>
      </View>
      {unread > 0 && (
        <View style={styles.chBadge}>
          <Text style={styles.chBadgeText}>{unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
    backgroundColor: colors.white,
  },
  navTitle: {
    fontSize: 17,
    fontFamily: fontFamily.sans.bold,
    flex: 1,
    letterSpacing: -0.3,
    color: colors.black,
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
  },
  totalBadge: {
    minWidth: 22,
    height: 22,
    backgroundColor: colors.black,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  totalBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "700",
    color: colors.lime,
  },
  body: { flex: 1 },
  loadingContainer: { padding: spacing.base, gap: 16 },
  skeletonRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  skeletonText: { gap: 6, flex: 1 },

  // Group
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  groupName: {
    fontSize: 10,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: colors.g400,
    textTransform: "uppercase",
  },

  // Channel
  ch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  chPressed: { backgroundColor: colors.g50 },
  chIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.g50,
    borderWidth: 2,
    borderColor: colors.g200,
    alignItems: "center",
    justifyContent: "center",
  },
  chIconUnread: {
    backgroundColor: colors.lime,
    borderColor: colors.black,
  },
  chName: {
    fontSize: 15,
    fontFamily: fontFamily.sans.semibold,
    color: colors.black,
  },
  chNameUnread: {
    fontFamily: fontFamily.sans.bold,
  },
  chDesc: {
    fontSize: 11,
    fontFamily: fontFamily.sans.regular,
    color: colors.g400,
  },
  chBadge: {
    minWidth: 20,
    height: 20,
    backgroundColor: colors.black,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  chBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "700",
    color: colors.lime,
  },
});
