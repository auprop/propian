import { useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, fontFamily, spacing, radii } from "@/theme";
import { supabase } from "@/lib/supabase";
import { useChatMessages, useSendMessage, useThreadReplies } from "@propian/shared/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { Avatar, Skeleton } from "@/components/ui";
import { ChatInput } from "@/components/chat/ChatInput";
import { IconChevLeft } from "@/components/icons/IconChevLeft";
import { formatTime } from "@propian/shared/utils";
import type { Message } from "@propian/shared/types";

/**
 * Thread screen — displays the original (parent) message
 * plus its replies underneath, with a reply input at the bottom.
 */
export default function ChatThreadScreen() {
  const { messageId, roomId } = useLocalSearchParams<{
    messageId: string;
    roomId: string;
  }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuth();

  // Fetch all messages in the room to find the parent
  const { data: allMessages, isLoading: messagesLoading } = useChatMessages(supabase, roomId ?? "");
  const { data: replies, isLoading: repliesLoading } = useThreadReplies(supabase, messageId ?? "");
  const sendMutation = useSendMessage(supabase);

  const parentMessage = allMessages?.find((m) => m.id === messageId);
  const childMessages = replies ?? [];
  const isLoading = messagesLoading || repliesLoading;

  const handleSend = useCallback(
    (content: string) => {
      if (!roomId || !messageId) return;
      sendMutation.mutate(
        { roomId, content, type: "text", parent_message_id: messageId },
        {
          onSuccess: () => {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          },
        }
      );
    },
    [roomId, messageId, sendMutation]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <IconChevLeft size={22} color={colors.black} />
          </Pressable>
          <Skeleton width={80} height={18} />
        </View>
        <View style={styles.loadingContainer}>
          <Skeleton width={300} height={80} />
          <Skeleton width={200} height={14} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Nav */}
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <IconChevLeft size={22} color={colors.black} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.navTitle}>Thread</Text>
            <Text style={styles.navSub}>
              {childMessages.length > 0
                ? `${childMessages.length} ${childMessages.length === 1 ? "reply" : "replies"}`
                : "No replies yet"}
            </Text>
          </View>
        </View>

        {/* Content */}
        <FlatList
          ref={flatListRef}
          data={childMessages}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            parentMessage ? (
              <View style={styles.parentContainer}>
                <View style={styles.parentMsg}>
                  <Avatar
                    src={parentMessage.author?.avatar_url}
                    name={parentMessage.author?.display_name ?? "User"}
                    size="sm"
                  />
                  <View style={styles.parentBubble}>
                    <View style={styles.parentBody}>
                      <View style={styles.parentHead}>
                        <Text style={styles.parentUser}>
                          {parentMessage.author?.display_name ?? "User"}
                        </Text>
                        <Text style={styles.parentTime}>
                          {formatTime(parentMessage.created_at)}
                        </Text>
                      </View>
                      <Text style={styles.parentText}>
                        {parentMessage.content?.replace(/<[^>]*>/g, "")}
                      </Text>

                      {/* Reactions */}
                      {(parentMessage.reactions?.length ?? 0) > 0 && (
                        <View style={styles.rxRow}>
                          {groupReactions(parentMessage.reactions ?? []).map(
                            ([emoji, count]) => (
                              <View key={emoji} style={styles.rx}>
                                <Text style={styles.rxEmoji}>{emoji}</Text>
                                <Text style={styles.rxCount}>{count}</Text>
                              </View>
                            )
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Reply count divider */}
                <View style={styles.replyDivider}>
                  <Text style={styles.replyDividerText}>
                    {childMessages.length > 0
                      ? `${childMessages.length} ${childMessages.length === 1 ? "REPLY" : "REPLIES"}`
                      : "NO REPLIES YET"}
                  </Text>
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.replyMsg}>
              <Avatar
                src={item.author?.avatar_url}
                name={item.author?.display_name ?? "User"}
                size="sm"
              />
              <View style={styles.replyBubble}>
                <View style={styles.replyBody}>
                  <View style={styles.replyHead}>
                    <Text style={styles.replyUser}>
                      {item.author?.display_name ?? "User"}
                    </Text>
                    <Text style={styles.replyTime}>
                      {formatTime(item.created_at)}
                    </Text>
                  </View>
                  <Text style={styles.replyText}>
                    {item.content?.replace(/<[^>]*>/g, "")}
                  </Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            parentMessage ? (
              <View style={styles.emptyReplies}>
                <Text style={styles.emptyRepliesText}>
                  Be the first to reply to this message
                </Text>
              </View>
            ) : (
              <View style={styles.emptyReplies}>
                <Text style={styles.emptyRepliesText}>
                  Message not found
                </Text>
              </View>
            )
          }
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          disabled={sendMutation.isPending}
          placeholder="Reply to thread..."
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─── Helpers ─── */

function groupReactions(
  reactions: { emoji: string }[]
): [string, number][] {
  const map = new Map<string, number>();
  reactions.forEach((r) => {
    map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1);
  });
  return Array.from(map.entries());
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1 },
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
  backBtn: { padding: 4 },
  navTitle: {
    fontSize: 15,
    fontFamily: fontFamily.sans.bold,
    color: colors.black,
  },
  navSub: {
    fontSize: 10,
    fontFamily: fontFamily.mono.regular,
    color: colors.g400,
  },
  loadingContainer: {
    padding: spacing.base,
    gap: 12,
  },
  listContent: {
    paddingBottom: 20,
  },

  // Parent message
  parentContainer: {},
  parentMsg: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 16,
  },
  parentBubble: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.g300,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  parentBody: { flex: 1, minWidth: 0 },
  parentHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
    flexWrap: "wrap",
  },
  parentUser: {
    fontFamily: fontFamily.sans.bold,
    fontSize: 14,
    color: colors.black,
  },
  parentTime: {
    fontFamily: fontFamily.mono.regular,
    fontSize: 10,
    color: colors.g400,
  },
  parentText: {
    fontFamily: fontFamily.sans.regular,
    fontSize: 14,
    lineHeight: 21,
    color: "#262626",
  },

  // Reactions
  rxRow: { flexDirection: "row", gap: 4, marginTop: 6, flexWrap: "wrap" },
  rx: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: 99,
  },
  rxEmoji: { fontSize: 12 },
  rxCount: {
    fontSize: 10,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "600",
    color: colors.g600,
  },

  // Reply divider
  replyDivider: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  replyDividerText: {
    fontSize: 11,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.g400,
  },

  // Reply messages
  replyMsg: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  replyBubble: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.g50,
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  replyBody: { flex: 1, minWidth: 0 },
  replyHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
    flexWrap: "wrap",
  },
  replyUser: {
    fontFamily: fontFamily.sans.bold,
    fontSize: 14,
    color: colors.black,
  },
  replyTime: {
    fontFamily: fontFamily.mono.regular,
    fontSize: 10,
    color: colors.g400,
  },
  replyText: {
    fontFamily: fontFamily.sans.regular,
    fontSize: 14,
    lineHeight: 21,
    color: "#262626",
  },

  // Empty replies
  emptyReplies: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyRepliesText: {
    fontSize: 13,
    fontFamily: fontFamily.sans.regular,
    color: colors.g400,
  },
});
