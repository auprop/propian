import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, fontFamily, spacing, radii } from "@/theme";
import { supabase } from "@/lib/supabase";
import { useKnowledgePins } from "@propian/shared/hooks";
import { Avatar, Skeleton } from "@/components/ui";
import { IconChevLeft } from "@/components/icons/IconChevLeft";
import { IconPin } from "@/components/icons/IconPin";
import type { KnowledgePin } from "@propian/shared/types";

export default function ChatPinnedScreen() {
  const { roomId, communityId } = useLocalSearchParams<{
    roomId?: string;
    communityId: string;
  }>();
  const router = useRouter();
  const { data: pins, isLoading } = useKnowledgePins(supabase, communityId ?? "");

  // Filter to pins from this channel if roomId is provided
  const filteredPins = roomId
    ? (pins ?? []).filter((p) => p.channel_id === roomId)
    : (pins ?? []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <IconChevLeft size={22} color={colors.black} />
          </Pressable>
          <Text style={styles.navTitle}>Pinned Messages</Text>
        </View>
        <View style={{ padding: spacing.base, gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <Skeleton width={32} height={32} radius={16} />
                <View style={{ gap: 4 }}>
                  <Skeleton width={120} height={14} />
                  <Skeleton width={60} height={10} />
                </View>
              </View>
              <Skeleton width={250} height={16} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconChevLeft size={22} color={colors.black} />
        </Pressable>
        <Text style={styles.navTitle}>Pinned Messages</Text>
        <Text style={styles.navCount}>{filteredPins.length}</Text>
      </View>

      <FlatList
        data={filteredPins}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PinnedItem pin={item} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconPin size={32} color={colors.g300} />
            <Text style={styles.emptyTitle}>No pinned messages</Text>
            <Text style={styles.emptyDesc}>
              Pin important messages to keep them easily accessible.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

/* ─── Pinned Item ─── */

function PinnedItem({ pin }: { pin: KnowledgePin }) {
  const author = pin.message?.author;
  const content = pin.message?.content?.replace(/<[^>]*>/g, "") ?? "";
  const timeLabel = formatRelativeTime(pin.created_at);
  const channelName = pin.channel?.name;

  return (
    <View style={styles.pinnedItem}>
      <View style={styles.pinnedHeader}>
        <Avatar
          src={author?.avatar_url}
          name={author?.display_name ?? "User"}
          size="sm"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.pinnedUser}>{author?.display_name ?? "User"}</Text>
          <View style={styles.pinnedMeta}>
            <Text style={styles.pinnedTime}>{timeLabel}</Text>
            {channelName && (
              <Text style={styles.pinnedChannel}>#{channelName}</Text>
            )}
          </View>
        </View>
      </View>
      <Text style={styles.pinnedContent} numberOfLines={3}>
        {content}
      </Text>
      {pin.category && (
        <View style={styles.pinnedTag}>
          <Text style={styles.pinnedTagText}>{pin.category}</Text>
        </View>
      )}
    </View>
  );
}

/* ─── Helpers ─── */

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  },
  backBtn: { padding: 4 },
  navTitle: {
    fontSize: 17,
    fontFamily: fontFamily.sans.bold,
    color: colors.black,
    flex: 1,
  },
  navCount: {
    fontSize: 10,
    fontFamily: fontFamily.mono.regular,
    color: colors.g400,
  },

  // Pinned item
  pinnedItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  pinnedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  pinnedUser: {
    fontSize: 14,
    fontFamily: fontFamily.sans.semibold,
    color: colors.black,
  },
  pinnedMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pinnedTime: {
    fontSize: 10,
    fontFamily: fontFamily.mono.regular,
    color: colors.g400,
  },
  pinnedChannel: {
    fontSize: 10,
    fontFamily: fontFamily.mono.regular,
    color: colors.g400,
  },
  pinnedContent: {
    fontSize: 14,
    fontFamily: fontFamily.sans.regular,
    color: "#262626",
    lineHeight: 21,
  },
  pinnedTag: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.g50,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: 99,
  },
  pinnedTagText: {
    fontSize: 10,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "600",
    color: colors.g500,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fontFamily.sans.semibold,
    color: colors.black,
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: fontFamily.sans.regular,
    color: colors.g400,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
