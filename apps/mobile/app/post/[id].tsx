import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Share,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fontFamily, radii, spacing } from "@/theme";
import { supabase } from "@/lib/supabase";
import { triggerHaptic } from "@/hooks/useHaptics";
import {
  usePost,
  useLikePost,
  useBookmark,
  useRepost,
  useCreatePost,
  useComments,
  useCreateComment,
} from "@propian/shared/hooks";
import { Avatar, Badge, Card, Button, Skeleton, EmptyState } from "@/components/ui";
import { IconHeart } from "@/components/icons/IconHeart";
import { IconHeartOutline } from "@/components/icons/IconHeartOutline";
import { IconComment } from "@/components/icons/IconComment";
import { IconRepost } from "@/components/icons/IconRepost";
import { IconShare } from "@/components/icons/IconShare";
import { IconBookmark } from "@/components/icons/IconBookmark";
import { IconEye } from "@/components/icons/IconEye";
import { IconVerified } from "@/components/icons/IconVerified";
import { formatCompact } from "@propian/shared/utils";
import { timeAgo } from "@propian/shared/utils";
import type { Post, Comment } from "@propian/shared/types";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: post, isLoading, isError } = usePost(supabase, id);

  /* Mutations */
  const likePost = useLikePost(supabase);
  const bookmarkPost = useBookmark(supabase);
  const repostPost = useRepost(supabase);

  /* Comments */
  const { query: commentsQuery } = useComments(supabase, id ?? "");
  const createComment = useCreateComment(supabase);
  const [commentText, setCommentText] = useState("");

  const comments: Comment[] = useMemo(
    () =>
      (commentsQuery.data?.pages?.flatMap((page: unknown) =>
        Array.isArray(page) ? page : []
      ) ?? []) as Comment[],
    [commentsQuery.data],
  );

  const handleSendComment = useCallback(() => {
    const content = commentText.trim();
    if (!content || !id || createComment.isPending) return;
    createComment.mutate(
      { postId: id, content },
      { onSuccess: () => setCommentText("") },
    );
  }, [commentText, id, createComment]);

  /* Handlers */
  const handleLike = useCallback(() => {
    if (!post) return;
    triggerHaptic("success");
    likePost.mutate({ postId: post.id, action: post.is_liked ? "unlike" : "like" });
  }, [post, likePost]);

  const handleBookmark = useCallback(() => {
    if (!post) return;
    triggerHaptic("success");
    bookmarkPost.mutate({ postId: post.id, action: post.is_bookmarked ? "unbookmark" : "bookmark" });
  }, [post, bookmarkPost]);

  const handleRepost = useCallback(() => {
    if (!post) return;
    triggerHaptic("light");
    repostPost.mutate({ postId: post.id, action: post.is_reposted ? "unrepost" : "repost" });
  }, [post, repostPost]);

  const handleShare = useCallback(async () => {
    if (!post) return;
    triggerHaptic("light");
    try {
      await Share.share({ message: `Check out this post on Propian: https://propian.com/post/${post.id}` });
    } catch (_) {}
  }, [post]);

  /* ---------------------------------------------------------------- */
  /*  Loading                                                          */
  /* ---------------------------------------------------------------- */

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Card>
          <View style={styles.header}>
            <Skeleton width={48} height={48} borderRadius={24} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width={160} height={14} borderRadius={4} />
              <Skeleton width={120} height={12} borderRadius={4} />
            </View>
          </View>
          <Skeleton width="100%" height={14} borderRadius={4} />
          <View style={{ height: 6 }} />
          <Skeleton width="90%" height={14} borderRadius={4} />
          <View style={{ height: 6 }} />
          <Skeleton width="70%" height={14} borderRadius={4} />
        </Card>
      </View>
    );
  }

  if (isError || !post) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <EmptyState
          title="Post not found"
          subtitle="This post may have been deleted or doesn't exist."
        />
      </View>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const author = post.author;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.g50 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          {/* Author header */}
          <Pressable
            onPress={() => {
              if (author?.username) {
                router.push({ pathname: "/profile/[username]", params: { username: author.username } });
              }
            }}
            style={styles.header}
          >
            <Avatar
              src={author?.avatar_url}
              name={author?.display_name || ""}
              size="lg"
            />
            <View style={styles.headerText}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName} numberOfLines={1}>
                  {author?.display_name || "Unknown"}
                </Text>
                {author?.is_verified && (
                  <IconVerified size={16} color={colors.lime} />
                )}
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.handle}>@{author?.username || "user"}</Text>
                <Text style={styles.dot}>-</Text>
                <Text style={styles.timestamp}>{timeAgo(post.created_at)}</Text>
              </View>
            </View>
          </Pressable>

          {/* Sentiment tag */}
          {post.sentiment_tag && (
            <Badge
              variant={
                post.sentiment_tag === "bullish"
                  ? "green"
                  : post.sentiment_tag === "bearish"
                    ? "red"
                    : "gray"
              }
              style={styles.sentimentBadge}
            >
              {post.sentiment_tag.toUpperCase()}
            </Badge>
          )}

          {/* Content */}
          {post.content ? (
            <Text style={styles.content}>{post.content}</Text>
          ) : null}

          {/* Quoted post embed */}
          {(post.type === "quote" || post.type === "repost") && post.quoted_post && (
            <Pressable
              style={({ pressed }) => [styles.quotedEmbed, pressed && styles.quotedEmbedPressed]}
              onPress={() => {
                router.push({ pathname: "/post/[id]" as any, params: { id: post.quoted_post!.id } });
              }}
            >
              <View style={styles.quotedEmbedHeader}>
                <Avatar
                  src={post.quoted_post.author?.avatar_url}
                  name={post.quoted_post.author?.display_name || ""}
                  size="sm"
                />
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.quotedEmbedName} numberOfLines={1}>
                      {post.quoted_post.author?.display_name || "Unknown"}
                    </Text>
                    {post.quoted_post.author?.is_verified && (
                      <IconVerified size={12} color={colors.lime} />
                    )}
                  </View>
                  <Text style={styles.quotedEmbedHandle}>
                    @{post.quoted_post.author?.username || "user"}
                  </Text>
                </View>
              </View>
              <Text style={styles.quotedEmbedContent} numberOfLines={5}>
                {post.quoted_post.content}
              </Text>
            </Pressable>
          )}

          {/* Deleted quoted post */}
          {(post.type === "quote" || post.type === "repost") && !post.quoted_post && post.quoted_post_id && (
            <View style={styles.quotedEmbedDeleted}>
              <Text style={styles.quotedEmbedDeletedText}>This post is unavailable</Text>
            </View>
          )}

          {/* Action Bar */}
          <View style={styles.actionBar}>
            <View style={styles.actionButton}>
              <IconComment size={16} color={colors.g400} />
              {post.comment_count > 0 && (
                <Text style={styles.actionCount}>{formatCompact(post.comment_count)}</Text>
              )}
            </View>

            <Pressable style={styles.actionButton} onPress={handleRepost}>
              <IconRepost size={20} color={post.is_reposted ? colors.green : colors.g400} />
              {post.repost_count > 0 && (
                <Text style={[styles.actionCount, post.is_reposted && styles.actionCountRepost]}>
                  {formatCompact(post.repost_count)}
                </Text>
              )}
            </Pressable>

            <Pressable style={styles.actionButton} onPress={handleLike}>
              {post.is_liked ? (
                <IconHeart size={17} color={colors.red} />
              ) : (
                <IconHeartOutline size={17} color={colors.g400} />
              )}
              {post.like_count > 0 && (
                <Text style={[styles.actionCount, post.is_liked && styles.actionCountLike]}>
                  {formatCompact(post.like_count)}
                </Text>
              )}
            </Pressable>

            <View style={styles.actionButton}>
              <IconEye size={18} color={colors.g400} />
              {post.view_count > 0 && (
                <Text style={styles.actionCount}>{formatCompact(post.view_count)}</Text>
              )}
            </View>

            <Pressable style={styles.actionButton} onPress={handleBookmark}>
              <IconBookmark size={17} color={post.is_bookmarked ? colors.lime : colors.g400} />
            </Pressable>

            <Pressable style={styles.actionButton} onPress={handleShare}>
              <IconShare size={19} color={colors.g400} />
            </Pressable>
          </View>
        </Card>

        {/* Comments section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>

          {commentsQuery.isLoading ? (
            <View style={{ gap: 12 }}>
              {[1, 2].map((i) => (
                <View key={i} style={styles.commentRow}>
                  <Skeleton width={32} height={32} borderRadius={16} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Skeleton width={100} height={12} borderRadius={4} />
                    <Skeleton width="80%" height={12} borderRadius={4} />
                  </View>
                </View>
              ))}
            </View>
          ) : comments.length === 0 ? (
            <Text style={styles.noComments}>No comments yet. Be the first!</Text>
          ) : (
            <View style={{ gap: 12 }}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentRow}>
                  <Avatar
                    src={comment.author?.avatar_url}
                    name={comment.author?.display_name ?? "User"}
                    size="sm"
                  />
                  <View style={{ flex: 1 }}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentAuthor}>
                        {comment.author?.display_name ?? "Unknown"}
                      </Text>
                      {comment.author?.is_verified && (
                        <IconVerified size={12} color={colors.lime} />
                      )}
                      <Text style={styles.commentTime}>{timeAgo(comment.created_at)}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.content}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Comment input */}
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor={colors.g400}
              value={commentText}
              onChangeText={setCommentText}
              maxLength={500}
              onSubmitEditing={handleSendComment}
              returnKeyType="send"
            />
            <Button
              variant="lime"
              size="sm"
              onPress={handleSendComment}
              disabled={!commentText.trim() || createComment.isPending}
            >
              {createComment.isPending ? "..." : "Send"}
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.g50,
    padding: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  headerText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  displayName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: colors.black,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  handle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g500,
  },
  dot: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g400,
  },
  timestamp: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g400,
  },
  sentimentBadge: {
    marginBottom: 10,
  },
  content: {
    fontFamily: "Outfit_400Regular",
    fontSize: 17,
    color: colors.black,
    lineHeight: 26,
    marginBottom: 14,
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.g100,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  actionCount: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: colors.g500,
  },
  actionCountLike: {
    color: colors.red,
  },
  actionCountRepost: {
    color: colors.green,
  },
  quotedEmbed: {
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.g50,
    marginBottom: 14,
  },
  quotedEmbedPressed: {
    backgroundColor: colors.g100,
    borderColor: colors.g300,
  },
  quotedEmbedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  quotedEmbedName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: colors.black,
  },
  quotedEmbedHandle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: colors.g400,
    marginTop: 1,
  },
  quotedEmbedContent: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g600,
    lineHeight: 20,
  },
  quotedEmbedDeleted: {
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: 12,
    padding: 16,
    backgroundColor: colors.g100,
    marginBottom: 14,
    alignItems: "center" as const,
  },
  quotedEmbedDeletedText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g400,
  },
  commentsSection: {
    marginTop: 16,
  },
  commentsTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: colors.black,
    marginBottom: 12,
  },
  noComments: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g400,
    textAlign: "center",
    paddingVertical: 20,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  commentAuthor: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: colors.black,
  },
  commentTime: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: colors.g400,
    marginLeft: 4,
  },
  commentText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g700,
    lineHeight: 20,
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.g100,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.black,
    backgroundColor: colors.white,
  },
});
