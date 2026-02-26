import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, fontFamily, spacing, radii } from "@/theme";
import { supabase } from "@/lib/supabase";
import { useChatMessages, useSendMessage } from "@propian/shared/hooks";
import { useAddReaction, useRemoveReaction } from "@propian/shared/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { Skeleton, EmptyState, Avatar } from "@/components/ui";
import { ChatInput } from "@/components/chat/ChatInput";
import { IconChevLeft } from "@/components/icons/IconChevLeft";
import { IconPin } from "@/components/icons/IconPin";
import { IconSearch } from "@/components/icons/IconSearch";
import { IconUsers } from "@/components/icons/IconUsers";
import { IconVerified } from "@/components/icons/IconVerified";
import { formatTime } from "@propian/shared/utils";
import { useAppStateRefresh } from "@/hooks/useAppStateRefresh";
import type { Message } from "@propian/shared/types";
import Svg, { Line, Path } from "react-native-svg";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "🚀", "👏", "💯", "😮"];

/* ─── Inline Icons ─── */

function IcThread({ size = 18, color = colors.g400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 7h5l2 3h8" />
      <Path d="M3 11h5l2 3h8" />
      <Path d="M3 15h5l2 3h8" />
    </Svg>
  );
}

export default function ChatConversationScreen() {
  const { roomId, channelName, communityId } = useLocalSearchParams<{
    roomId: string;
    channelName?: string;
    communityId?: string;
  }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const { user } = useAuth();
  const { data: messages, isLoading } = useChatMessages(supabase, roomId);
  const sendMutation = useSendMessage(supabase);
  const addReaction = useAddReaction(supabase);
  const removeReaction = useRemoveReaction(supabase);

  // Reconnect realtime when app comes back from background
  useAppStateRefresh(supabase, roomId);

  const currentUserId = user?.id;

  const handleSend = useCallback(
    (content: string) => {
      sendMutation.mutate(
        { roomId, content, type: "text" },
        {
          onSuccess: () => {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          },
        }
      );
    },
    [roomId, sendMutation]
  );

  // Messages are already in chronological order from the API
  const sortedMessages = messages ?? [];

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const prevMsg = index > 0 ? sortedMessages[index - 1] : null;
      const showDate =
        !prevMsg ||
        new Date(item.created_at).toDateString() !==
          new Date(prevMsg.created_at).toDateString();

      return (
        <>
          {showDate && (
            <View style={styles.dateSep}>
              <View style={styles.dateLine} />
              <Text style={styles.dateText}>
                {new Date(item.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
              <View style={styles.dateLine} />
            </View>
          )}
          <MessageItem
            message={item}
            isSent={item.user_id === currentUserId}
            currentUserId={currentUserId}
            onPressAvatar={() => {}}
            onPressThread={() =>
              router.push({
                pathname: "/chat-thread/[messageId]",
                params: { messageId: item.id, roomId },
              })
            }
            onAddReaction={(messageId, emoji) =>
              addReaction.mutate({ messageId, emoji, userId: currentUserId })
            }
            onRemoveReaction={(messageId, emoji) =>
              removeReaction.mutate({ messageId, emoji, userId: currentUserId })
            }
          />
        </>
      );
    },
    [currentUserId, sortedMessages, router, roomId, addReaction, removeReaction]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()}>
            <IconChevLeft size={20} color={colors.black} />
          </Pressable>
          <Skeleton width={150} height={18} />
          <View style={{ width: 20 }} />
        </View>
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[styles.skeletonMsg, i % 2 === 0 && styles.skeletonMsgRight]}
            >
              <Skeleton width={30} height={30} radius={15} />
              <Skeleton width={200} height={50} />
            </View>
          ))}
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
        {/* Header */}
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconChevLeft size={22} color={colors.black} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              #{channelName ?? "chat"}
            </Text>
            <Text style={styles.headerSub}>
              {messages?.length ?? 0} messages
            </Text>
          </View>
          {communityId && (
            <>
              <Pressable
                style={styles.headerBtn}
                onPress={() =>
                  router.push({
                    pathname: "/chat-pinned",
                    params: { roomId, communityId },
                  })
                }
              >
                <IconPin size={20} color={colors.g500} />
              </Pressable>
              <Pressable
                style={styles.headerBtn}
                onPress={() =>
                  router.push({
                    pathname: "/chat-search",
                    params: { communityId, roomId },
                  })
                }
              >
                <IconSearch size={20} color={colors.g500} />
              </Pressable>
              <Pressable
                style={styles.headerBtn}
                onPress={() =>
                  router.push({
                    pathname: "/chat-members",
                    params: { communityId },
                  })
                }
              >
                <IconUsers size={20} color={colors.g500} />
              </Pressable>
            </>
          )}
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={sortedMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          onLayout={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <EmptyState
              title="No messages yet"
              description="Send a message to start the conversation."
            />
          }
        />

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          disabled={sendMutation.isPending}
          placeholder={`Message #${channelName ?? "chat"}`}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─── Message Item ─── */

function MessageItem({
  message,
  isSent,
  currentUserId,
  onPressAvatar,
  onPressThread,
  onAddReaction,
  onRemoveReaction,
}: {
  message: Message;
  isSent: boolean;
  currentUserId?: string;
  onPressAvatar: () => void;
  onPressThread: () => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const hasReactions = (message.reactions?.length ?? 0) > 0;
  const isPinned = message.is_pinned_to_library;
  const replyCount = message.reply_count ?? 0;

  // Group reactions by emoji with "reacted by me" info
  const reactionMap = new Map<string, { count: number; reactedByMe: boolean }>();
  message.reactions?.forEach((r) => {
    const existing = reactionMap.get(r.emoji) ?? { count: 0, reactedByMe: false };
    existing.count += 1;
    if (r.user_id === currentUserId) existing.reactedByMe = true;
    reactionMap.set(r.emoji, existing);
  });

  function handleReactionTap(emoji: string) {
    const info = reactionMap.get(emoji);
    if (info?.reactedByMe) {
      onRemoveReaction(message.id, emoji);
    } else {
      onAddReaction(message.id, emoji);
    }
  }

  function handleQuickReaction(emoji: string) {
    onAddReaction(message.id, emoji);
    setShowEmojiPicker(false);
  }

  return (
    <>
      <Pressable style={styles.msg} onLongPress={() => setShowEmojiPicker(true)}>
        <Pressable onPress={onPressAvatar}>
          <Avatar
            src={message.author?.avatar_url}
            name={message.author?.display_name ?? "User"}
            size="sm"
          />
        </Pressable>
        <View style={[styles.msgBubble, isPinned && styles.msgBubblePinned]}>
          <View style={styles.msgBody}>
            <View style={styles.msgHead}>
              <Text style={styles.msgUser}>{message.author?.display_name ?? "User"}</Text>
              {message.author?.is_verified && (
                <IconVerified size={14} />
              )}
              <Text style={styles.msgTime}>{formatTime(message.created_at)}</Text>
            </View>

            {message.type === "image" ? (
              <View style={styles.msgImg}>
                <Image
                  source={{ uri: message.content }}
                  style={styles.msgImgImage}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <Text style={styles.msgText}>{message.content?.replace(/<[^>]*>/g, "")}</Text>
            )}

            {/* Reactions */}
            {hasReactions && (
              <View style={styles.rxRow}>
                {Array.from(reactionMap.entries()).map(([emoji, info]) => (
                  <Pressable
                    key={emoji}
                    style={[styles.rx, info.reactedByMe && styles.rxReacted]}
                    onPress={() => handleReactionTap(emoji)}
                  >
                    <Text style={styles.rxEmoji}>{emoji}</Text>
                    <Text style={[styles.rxCount, info.reactedByMe && styles.rxCountReacted]}>
                      {info.count}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Thread link */}
            {replyCount > 0 && (
              <Pressable style={styles.threadLink} onPress={onPressThread}>
                <IcThread size={14} color={colors.black} />
                <Text style={styles.threadLinkText}>
                  {replyCount} {replyCount === 1 ? "reply" : "replies"}
                </Text>
                {message.last_reply_at && (
                  <Text style={styles.threadLinkTime}>
                    Last reply {formatTime(message.last_reply_at)}
                  </Text>
                )}
              </Pressable>
            )}

            {/* Pinned indicator */}
            {isPinned && (
              <View style={styles.pinnedTag}>
                <IconPin size={10} color={colors.g400} />
                <Text style={styles.pinnedText}>Pinned</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>

      {/* Emoji quick picker modal */}
      <Modal
        visible={showEmojiPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <Pressable style={styles.emojiOverlay} onPress={() => setShowEmojiPicker(false)}>
          <View style={styles.emojiSheet}>
            <View style={styles.emojiRow}>
              {QUICK_EMOJIS.map((emoji) => (
                <Pressable
                  key={emoji}
                  style={styles.emojiBtn}
                  onPress={() => handleQuickReaction(emoji)}
                >
                  <Text style={styles.emojiBtnText}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.emojiThreadBtn} onPress={() => { setShowEmojiPicker(false); onPressThread(); }}>
              <IcThread size={16} color={colors.g600} />
              <Text style={styles.emojiThreadText}>Reply in thread</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
    backgroundColor: colors.white,
    gap: 4,
  },
  backButton: { padding: 4 },
  headerTitle: {
    fontFamily: fontFamily.sans.bold,
    fontSize: 15,
    color: colors.black,
  },
  headerSub: {
    fontFamily: fontFamily.mono.regular,
    fontSize: 10,
    color: colors.g400,
  },
  headerBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
  },
  messageList: { paddingVertical: spacing.sm },
  loadingContainer: {
    flex: 1,
    padding: spacing.base,
    gap: 12,
    justifyContent: "flex-end",
  },
  skeletonMsg: {
    flexDirection: "row",
    gap: 8,
    alignSelf: "flex-start",
  },
  skeletonMsgRight: { alignSelf: "flex-end" },

  // Date separator
  dateSep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: colors.g200 },
  dateText: {
    fontSize: 10,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "600",
    color: colors.g400,
  },

  // Message
  msg: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  msgBubble: {
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
  msgBubblePinned: {
    backgroundColor: "rgba(168, 255, 57, 0.06)",
    borderColor: "rgba(168, 255, 57, 0.25)",
  },
  msgBody: { flex: 1, minWidth: 0 },
  msgHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
    flexWrap: "wrap",
  },
  msgUser: {
    fontFamily: fontFamily.sans.bold,
    fontSize: 14,
    color: colors.black,
  },
  msgTime: {
    fontFamily: fontFamily.mono.regular,
    fontSize: 10,
    color: colors.g400,
  },
  msgText: {
    fontFamily: fontFamily.sans.regular,
    fontSize: 14,
    lineHeight: 21,
    color: "#262626",
  },
  msgImg: {
    width: "100%",
    maxWidth: 280,
    height: 200,
    borderRadius: radii.md,
    overflow: "hidden",
    marginTop: 6,
    borderWidth: 2,
    borderColor: colors.g200,
    backgroundColor: colors.g50,
  },
  msgImgImage: {
    width: "100%",
    height: "100%",
  },
  msgImgText: {
    fontSize: 12,
    fontFamily: fontFamily.sans.semibold,
    color: colors.g500,
  },

  // Reactions
  rxRow: { flexDirection: "row", gap: 4, marginTop: 6, flexWrap: "wrap" },
  rx: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.g50,
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: 99,
  },
  rxReacted: {
    backgroundColor: "rgba(168, 255, 57, 0.1)",
    borderColor: "#a8ff39",
  },
  rxEmoji: { fontSize: 12 },
  rxCount: {
    fontSize: 10,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "600",
    color: colors.g600,
  },
  rxCountReacted: {
    color: "#5a8a00",
  },

  // Thread link
  threadLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(168, 255, 57, 0.08)",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  threadLinkText: {
    fontSize: 12,
    fontFamily: fontFamily.sans.semibold,
    color: colors.black,
  },
  threadLinkTime: {
    fontSize: 11,
    fontFamily: fontFamily.sans.regular,
    color: colors.g400,
    marginLeft: 4,
  },

  // Emoji quick picker
  emojiOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  emojiSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
  },
  emojiRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  emojiBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.g50,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiBtnText: {
    fontSize: 20,
  },
  emojiThreadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.g200,
  },
  emojiThreadText: {
    fontSize: 14,
    fontFamily: fontFamily.sans.semibold,
    color: colors.g600,
  },

  // Pinned
  pinnedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
  },
  pinnedText: {
    fontSize: 10,
    fontFamily: fontFamily.sans.regular,
    color: colors.g400,
  },
});
