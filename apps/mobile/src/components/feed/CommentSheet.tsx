import { useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Share,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, spacing, radii } from "@/theme";
import { supabase } from "@/lib/supabase";
import {
  useComments,
  useCreateComment,
  useLikeComment,
  useBookmarkComment,
  useCurrentProfile,
} from "@propian/shared/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { triggerHaptic } from "@/hooks/useHaptics";
import { Avatar, Skeleton } from "@/components/ui";
import { IconClose } from "@/components/icons/IconClose";
import { IconSend } from "@/components/icons/IconSend";
import { IconVerified } from "@/components/icons/IconVerified";
import { IconPro } from "@/components/icons/IconPro";
import { IconComment } from "@/components/icons/IconComment";
import { IconHeart } from "@/components/icons/IconHeart";
import { IconHeartOutline } from "@/components/icons/IconHeartOutline";
import { IconBookmark } from "@/components/icons/IconBookmark";
import { IconBookmarkFilled } from "@/components/icons/IconBookmarkFilled";
import { IconShare } from "@/components/icons/IconShare";
import { timeAgo, formatCompact, isRTLText } from "@propian/shared/utils";
import Svg, { Path } from "react-native-svg";
import type { Comment } from "@propian/shared/types";

/* ─── Render text with @mentions highlighted in green ─── */
function renderTextWithMentions(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(@\w+)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    /^@\w+$/.test(part) ? (
      <Text key={i} style={{ color: "#00743c" }}>{part}</Text>
    ) : (
      <Text key={i}>{part}</Text>
    )
  );
}

/* ─── Inline reply icon ─── */
function IconReply({ size = 16, color = "#a3a3a3" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 17l-5-5 5-5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 12h11a4 4 0 0 1 4 4v1"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface CommentSheetProps {
  visible: boolean;
  postId: string;
  onClose: () => void;
}

export function CommentSheet({ visible, postId, onClose }: CommentSheetProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string } | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  const { user } = useAuth();
  const { data: myProfile } = useCurrentProfile(supabase, user?.id);

  const { query } = useComments(supabase, postId);
  const createComment = useCreateComment(supabase);
  const likeCommentMutation = useLikeComment(supabase);
  const bookmarkCommentMutation = useBookmarkComment(supabase);

  const comments: Comment[] = useMemo(
    () => (query.data?.pages?.flatMap((page) => (Array.isArray(page) ? page : [])) ?? []) as Comment[],
    [query.data]
  );

  const handleSend = useCallback(() => {
    const content = text.trim();
    if (!content || createComment.isPending) return;
    triggerHaptic("success");
    createComment.mutate(
      { postId, content, parentId: replyTo?.id ?? null },
      {
        onSuccess: () => {
          setText("");
          setReplyTo(null);
        },
      }
    );
  }, [text, postId, createComment, replyTo]);

  const handleReply = useCallback((comment: Comment) => {
    setReplyTo({ id: comment.id, authorName: comment.author?.display_name || "Unknown" });
    triggerHaptic("light");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleCommentLike = useCallback(
    (comment: Comment) => {
      triggerHaptic("light");
      likeCommentMutation.mutate({
        commentId: comment.id,
        postId,
        action: comment.is_liked ? "unlike" : "like",
      });
    },
    [postId, likeCommentMutation]
  );

  const handleCommentBookmark = useCallback(
    (comment: Comment) => {
      triggerHaptic("light");
      bookmarkCommentMutation.mutate({
        commentId: comment.id,
        postId,
        action: comment.is_bookmarked ? "unbookmark" : "bookmark",
      });
    },
    [postId, bookmarkCommentMutation]
  );

  const handleCommentShare = useCallback(async (comment: Comment) => {
    triggerHaptic("light");
    try {
      await Share.share({
        message: `${comment.author?.display_name || "Someone"} on Propian: "${comment.content}"`,
      });
    } catch (_) {}
  }, []);

  /* ─── Flatten all nested replies into a single-level list ─── */
  const flattenReplies = (replies: Comment[]): Comment[] => {
    const flat: Comment[] = [];
    for (const reply of replies) {
      flat.push(reply);
      if (reply.replies && reply.replies.length > 0) {
        flat.push(...flattenReplies(reply.replies));
      }
    }
    return flat;
  };

  /* ─── Render a single comment (no recursion) ─── */
  const renderSingleComment = (comment: Comment, isReply = false) => (
    <View key={comment.id} style={[styles.commentCard, isReply && styles.replyCard]}>
      {/* Thread line for replies */}
      {isReply && <View style={styles.threadLine} />}

      <Pressable
        onPress={() => {
          if (comment.author?.username) {
            onClose();
            router.push({
              pathname: "/profile/[username]",
              params: { username: comment.author.username },
            });
          }
        }}
      >
        <Avatar
          src={comment.author?.avatar_url}
          name={comment.author?.display_name || "User"}
          size="sm"
        />
      </Pressable>

      <View style={styles.commentBody}>
        {/* Author + time */}
        <View style={styles.commentMeta}>
          <Text style={styles.commentAuthor} numberOfLines={1}>
            {comment.author?.display_name || "Unknown"}
          </Text>
          {comment.author?.is_verified && (
            <IconVerified size={12} />
          )}
          {comment.author?.pro_subscription_status === "active" && (
            <IconPro size={12} />
          )}
          <Text style={styles.commentDot}>·</Text>
          <Text style={styles.commentTime}>{timeAgo(comment.created_at)}</Text>
        </View>

        {/* Content */}
        <Text style={[styles.commentText, isRTLText(comment.content) && { textAlign: "right" }]}>{renderTextWithMentions(comment.content)}</Text>

        {/* Action bar */}
        <View style={styles.commentActions}>
          {/* Reply */}
          <Pressable
            style={styles.commentAction}
            onPress={() => handleReply(comment)}
            hitSlop={8}
          >
            <IconReply size={15} color={colors.g400} />
            {(comment.reply_count ?? 0) > 0 && (
              <Text style={styles.commentActionCount}>
                {formatCompact(comment.reply_count ?? 0)}
              </Text>
            )}
          </Pressable>

          {/* Like */}
          <Pressable
            style={styles.commentAction}
            onPress={() => handleCommentLike(comment)}
            hitSlop={8}
          >
            {comment.is_liked ? (
              <IconHeart size={15} color={colors.red} />
            ) : (
              <IconHeartOutline size={15} color={colors.g400} />
            )}
            {comment.like_count > 0 && (
              <Text
                style={[
                  styles.commentActionCount,
                  comment.is_liked && { color: colors.red },
                ]}
              >
                {formatCompact(comment.like_count)}
              </Text>
            )}
          </Pressable>

          {/* Bookmark */}
          <Pressable
            style={styles.commentAction}
            onPress={() => handleCommentBookmark(comment)}
            hitSlop={8}
          >
            {comment.is_bookmarked ? (
              <IconBookmarkFilled size={15} color={colors.green} />
            ) : (
              <IconBookmark size={15} color={colors.g400} />
            )}
          </Pressable>

          {/* Share */}
          <Pressable
            style={styles.commentAction}
            onPress={() => handleCommentShare(comment)}
            hitSlop={8}
          >
            <IconShare size={15} color={colors.g400} />
          </Pressable>
        </View>
      </View>
    </View>
  );

  /* ─── Render top-level comment + flat replies with "View more" ─── */
  const renderCommentWithReplies = (comment: Comment) => {
    const allReplies = comment.replies ? flattenReplies(comment.replies) : [];
    const isExpanded = expandedThreads.has(comment.id);
    const visibleReplies = isExpanded ? allReplies : allReplies.slice(0, 1);
    const hiddenCount = allReplies.length - 1;

    return (
      <View key={comment.id}>
        {renderSingleComment(comment, false)}

        {allReplies.length > 0 && (
          <View style={styles.repliesContainer}>
            {visibleReplies.map((reply) => renderSingleComment(reply, true))}

            {/* View more / Show less toggle */}
            {hiddenCount > 0 && (
              <Pressable
                style={styles.viewMoreBtn}
                onPress={() => {
                  triggerHaptic("light");
                  setExpandedThreads((prev) => {
                    const next = new Set(prev);
                    if (next.has(comment.id)) {
                      next.delete(comment.id);
                    } else {
                      next.add(comment.id);
                    }
                    return next;
                  });
                }}
                hitSlop={4}
              >
                <Text style={styles.viewMoreText}>
                  {isExpanded
                    ? "Show less"
                    : `View ${hiddenCount} more ${hiddenCount === 1 ? "reply" : "replies"}`}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderItem = ({ item }: { item: Comment }) => renderCommentWithReplies(item);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={[styles.safe, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <IconClose size={22} color={colors.g600} />
            </Pressable>
            <Text style={styles.title}>
              {comments.length > 0 ? `Replies` : "Replies"}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Comments list */}
          {query.isLoading ? (
            <View style={styles.loadingContainer}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.skeletonRow}>
                  <Skeleton width={36} height={36} radius={18} />
                  <View style={{ gap: 6, flex: 1 }}>
                    <Skeleton width={120} height={12} />
                    <Skeleton width="85%" height={12} />
                  </View>
                </View>
              ))}
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconComment size={36} color={colors.g200} />
              <Text style={styles.emptyTitle}>No replies yet</Text>
              <Text style={styles.emptyDesc}>
                Start the conversation — share your thoughts!
              </Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Input bar */}
          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Avatar
              src={myProfile?.avatar_url}
              name={myProfile?.display_name || ""}
              size="sm"
            />
            <View style={{ flex: 1 }}>
              {/* Reply indicator */}
              {replyTo && (
                <View style={styles.replyIndicator}>
                  <Text style={styles.replyIndicatorText}>
                    Replying to{" "}
                    <Text style={styles.replyIndicatorName}>
                      {replyTo.authorName}
                    </Text>
                  </Text>
                  <Pressable
                    onPress={() => setReplyTo(null)}
                    hitSlop={8}
                    style={styles.replyIndicatorClose}
                  >
                    <Text style={styles.replyIndicatorX}>✕</Text>
                  </Pressable>
                </View>
              )}
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={inputRef}
                  style={[styles.input, isRTLText(text) && { textAlign: "right" }]}
                  placeholder={replyTo ? `Reply to ${replyTo.authorName}...` : "Write a reply..."}
                  placeholderTextColor={colors.g400}
                  value={text}
                  onChangeText={setText}
                  multiline
                  maxLength={500}
                  returnKeyType="default"
                />
              </View>
            </View>
            <Pressable
              onPress={handleSend}
              disabled={!text.trim() || createComment.isPending}
              style={[
                styles.sendButton,
                text.trim() && !createComment.isPending && styles.sendButtonActive,
              ]}
            >
              {createComment.isPending ? (
                <ActivityIndicator size="small" color={colors.black} />
              ) : (
                <IconSend
                  size={18}
                  color={text.trim() ? colors.black : colors.g400}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  safe: {
    flex: 1,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: colors.black,
  },

  /* Loading */
  loadingContainer: {
    padding: spacing.base,
    gap: 20,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  /* Empty */
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingBottom: 60,
  },
  emptyTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: colors.g500,
    marginTop: 8,
  },
  emptyDesc: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g400,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 40,
  },

  /* List */
  listContent: {
    flexGrow: 1,
  },

  /* Comment card */
  commentCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  replyCard: {
    paddingLeft: 56,
    borderBottomWidth: 0,
    paddingTop: 10,
    paddingBottom: 2,
  },
  threadLine: {
    position: "absolute",
    left: 34,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.g100,
    borderRadius: 1,
  },
  commentBody: {
    flex: 1,
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  commentAuthor: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: colors.black,
    flexShrink: 1,
  },
  commentDot: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: colors.g300,
  },
  commentTime: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g400,
  },
  commentText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: colors.g700,
    lineHeight: 22,
  },

  /* Comment action bar */
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginTop: 6,
    paddingBottom: 6,
  },
  commentAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  commentActionCount: {
    fontFamily: "Outfit_500Medium",
    fontSize: 12,
    color: colors.g400,
  },

  /* Replies container */
  repliesContainer: {
    position: "relative",
  },
  viewMoreBtn: {
    paddingLeft: 56,
    paddingVertical: 8,
    paddingRight: 16,
  },
  viewMoreText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: colors.lime,
  },

  /* Reply indicator */
  replyIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 4,
    backgroundColor: colors.lime10,
    borderRadius: radii.sm,
  },
  replyIndicatorText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g500,
  },
  replyIndicatorName: {
    fontFamily: "Outfit_600SemiBold",
    color: colors.black,
  },
  replyIndicatorClose: {
    padding: 2,
  },
  replyIndicatorX: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: colors.g400,
  },

  /* Input bar */
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.g100,
    backgroundColor: colors.white,
  },
  inputWrapper: {
    backgroundColor: colors.g50,
    borderRadius: radii.xl,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    maxHeight: 120,
    minHeight: 40,
    justifyContent: "center",
  },
  input: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: colors.black,
    lineHeight: 20,
    padding: 0,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.g100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Platform.OS === "ios" ? 0 : 2,
  },
  sendButtonActive: {
    backgroundColor: colors.lime,
  },
});
