import { Pressable, View, Text, StyleSheet } from "react-native";
import { colors, fontFamily, spacing } from "@/theme";
import { Avatar } from "@/components/ui";
import { timeAgo } from "@propian/shared/utils";
import type { ChatRoom } from "@propian/shared/types";

interface RoomItemProps {
  room: ChatRoom;
  onPress: () => void;
}

export function RoomItem({ room, onPress }: RoomItemProps) {
  const lastMessage = room.last_message;
  const hasUnread = (room.unread_count ?? 0) > 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Avatar
        src={null}
        name={room.name || "Chat"}
        size="lg"
        showStatus
        isOnline={false}
      />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.name, hasUnread && styles.nameBold]} numberOfLines={1}>
            {room.name || "Direct Message"}
          </Text>
          {lastMessage && (
            <Text style={styles.time}>{timeAgo(lastMessage.created_at)}</Text>
          )}
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[styles.preview, hasUnread && styles.previewBold]}
            numberOfLines={1}
          >
            {lastMessage?.content || "No messages yet"}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{room.unread_count}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  pressed: {
    backgroundColor: colors.g50,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  name: {
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: colors.black,
    flex: 1,
    marginRight: 8,
  },
  nameBold: {
    fontFamily: "Outfit_700Bold",
  },
  time: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: colors.g400,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  preview: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g500,
    flex: 1,
    marginRight: 8,
  },
  previewBold: {
    fontFamily: "Outfit_500Medium",
    color: colors.g700,
  },
  unreadBadge: {
    backgroundColor: colors.lime,
    borderWidth: 1.5,
    borderColor: colors.black,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: colors.black,
  },
});
