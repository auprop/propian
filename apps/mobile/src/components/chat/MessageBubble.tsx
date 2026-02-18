import { View, Text, StyleSheet } from "react-native";
import { colors, fontFamily, radii, spacing } from "@/theme";
import { Avatar } from "@/components/ui";
import { formatTime } from "@propian/shared/utils";
import type { Message } from "@propian/shared/types";

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
}

export function MessageBubble({ message, isSent }: MessageBubbleProps) {
  return (
    <View style={[styles.row, isSent && styles.rowSent]}>
      {!isSent && (
        <Avatar
          src={message.author?.avatar_url}
          name={message.author?.display_name || ""}
          size="sm"
        />
      )}
      <View style={[styles.bubble, isSent ? styles.bubbleSent : styles.bubbleReceived]}>
        {!isSent && message.author && (
          <Text style={styles.authorName}>{message.author.display_name}</Text>
        )}
        <Text style={[styles.content, isSent && styles.contentSent]}>
          {message.content}
        </Text>
        <Text style={[styles.time, isSent && styles.timeSent]}>
          {formatTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: spacing.base,
    maxWidth: "85%",
  },
  rowSent: {
    alignSelf: "flex-end",
  },
  bubble: {
    borderRadius: radii.lg,
    padding: 12,
    borderWidth: 2,
    borderColor: colors.black,
    maxWidth: "100%",
  },
  bubbleSent: {
    backgroundColor: colors.lime,
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: colors.g100,
    borderBottomLeftRadius: 4,
  },
  authorName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: colors.g600,
    marginBottom: 2,
  },
  content: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.black,
    lineHeight: 20,
  },
  contentSent: {
    color: colors.black,
  },
  time: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: colors.g500,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timeSent: {
    color: colors.g700,
  },
});
