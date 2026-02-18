import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, fontFamily, spacing } from "@/theme";
import { supabase } from "@/lib/supabase";
import { useChatRooms } from "@propian/shared/hooks";
import { Input, EmptyState, Skeleton } from "@/components/ui";
import { RoomItem } from "@/components/chat/RoomItem";
import { IconChat } from "@/components/icons/IconChat";
import { IconSearch } from "@/components/icons/IconSearch";
import type { ChatRoom } from "@propian/shared/types";

export default function ChatRoomsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: rooms, isLoading } = useChatRooms(supabase);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRooms = (rooms ?? []).filter((room: ChatRoom) => {
    if (!searchQuery) return true;
    return room.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleRoomPress = useCallback(
    (roomId: string) => {
      router.push({ pathname: "/chat-room/[roomId]", params: { roomId } });
    },
    [router]
  );

  const renderRoom = useCallback(
    ({ item }: { item: ChatRoom }) => (
      <RoomItem room={item} onPress={() => handleRoomPress(item.id)} />
    ),
    [handleRoomPress]
  );

  const ListHeader = useCallback(() => (
    <View style={styles.searchContainer}>
      <Input
        placeholder="Search conversations..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
    </View>
  ), [searchQuery]);

  if (isLoading) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Skeleton height={48} />
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={56} height={56} radius={28} />
              <View style={styles.skeletonText}>
                <Skeleton width={150} height={14} />
                <Skeleton width={200} height={12} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <FlatList
        data={filteredRooms}
        keyExtractor={(item) => item.id}
        renderItem={renderRoom}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={
          <EmptyState
            icon={<IconChat size={40} color={colors.g300} />}
            title="No conversations"
            description="Start chatting with other traders."
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
  },
  headerTitle: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 24,
    color: colors.black,
    letterSpacing: -0.5,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  listContent: {
    paddingBottom: 100,
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
