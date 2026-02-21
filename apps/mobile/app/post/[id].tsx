import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Share,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, spacing, shadows } from "@/theme";
import { supabase } from "@/lib/supabase";
import { triggerHaptic } from "@/hooks/useHaptics";
import {
  usePost,
  useLikePost,
  useBookmark,
  useRepost,
  useComments,
  useCreateComment,
  useLikeComment,
  useBookmarkComment,
  useCurrentProfile,
} from "@propian/shared/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { Avatar, Badge, Skeleton } from "@/components/ui";
import { IconHeart } from "@/components/icons/IconHeart";
import { IconHeartOutline } from "@/components/icons/IconHeartOutline";
import { IconComment } from "@/components/icons/IconComment";
import { IconRepost } from "@/components/icons/IconRepost";
import { IconShare } from "@/components/icons/IconShare";
import { IconBookmark } from "@/components/icons/IconBookmark";
import { IconVerified } from "@/components/icons/IconVerified";
import { IconSend } from "@/components/icons/IconSend";
import { IconClose } from "@/components/icons/IconClose";
import { formatCompact, timeAgo } from "@propian/shared/utils";
import { parseChartRef, buildMiniChartUrl, formatChartLabel } from "@propian/shared/utils";
import { isRTLText } from "@propian/shared/utils";
import { WebView } from "react-native-webview";
import Svg, { Path } from "react-native-svg";
import { IconChevLeft } from "@/components/icons/IconChevLeft";
import type { Comment } from "@propian/shared/types";

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

/* ─── Detail Image Embed (dynamic aspect ratio, higher cap) ─── */
const DETAIL_IMG_MIN_H = 200;
const DETAIL_IMG_MAX_H = 520;
const DETAIL_IMG_FALLBACK_H = 320;

function DetailImageEmbed({ url, onPress }: { url: string; onPress: () => void }) {
  const { width: screenWidth } = useWindowDimensions();
  const [imgHeight, setImgHeight] = useState(DETAIL_IMG_FALLBACK_H);
  const containerWidth = screenWidth - 32; // 16px margin on each side

  useEffect(() => {
    Image.getSize(
      url,
      (w, h) => {
        const ratio = w / h;
        const natural = containerWidth / ratio;
        setImgHeight(Math.round(Math.min(Math.max(natural, DETAIL_IMG_MIN_H), DETAIL_IMG_MAX_H)));
      },
      () => setImgHeight(DETAIL_IMG_FALLBACK_H),
    );
  }, [url, containerWidth]);

  return (
    <Pressable style={[styles.imageEmbedDetail, { height: imgHeight }]} onPress={onPress}>
      <Image
        source={{ uri: url }}
        style={styles.imageEmbedDetailImg}
        resizeMode="cover"
      />
    </Pressable>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const { user } = useAuth();
  const { data: myProfile } = useCurrentProfile(supabase, user?.id);
  const { data: post, isLoading, isError } = usePost(supabase, id);

  /* Mutations */
  const likePost = useLikePost(supabase);
  const bookmarkPost = useBookmark(supabase);
  const repostPost = useRepost(supabase);

  /* Comments */
  const { query: commentsQuery } = useComments(supabase, id ?? "");
  const createComment = useCreateComment(supabase);
  const likeCommentMutation = useLikeComment(supabase);
  const bookmarkCommentMutation = useBookmarkComment(supabase);

  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string } | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [imageLightboxUrl, setImageLightboxUrl] = useState<string | null>(null);

  const comments: Comment[] = useMemo(
    () =>
      (commentsQuery.data?.pages?.flatMap((page: unknown) =>
        Array.isArray(page) ? page : [],
      ) ?? []) as Comment[],
    [commentsQuery.data],
  );

  const handleSendComment = useCallback(() => {
    const content = commentText.trim();
    if (!content || !id || createComment.isPending) return;
    triggerHaptic("success");
    createComment.mutate(
      { postId: id, content, parentId: replyTo?.id ?? null },
      {
        onSuccess: () => {
          setCommentText("");
          setReplyTo(null);
        },
      },
    );
  }, [commentText, id, createComment, replyTo]);

  const handleReply = useCallback((comment: Comment) => {
    setReplyTo({ id: comment.id, authorName: comment.author?.display_name || "Unknown" });
    triggerHaptic("light");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleCommentLike = useCallback(
    (comment: Comment) => {
      if (!id) return;
      triggerHaptic("light");
      likeCommentMutation.mutate({
        commentId: comment.id,
        postId: id,
        action: comment.is_liked ? "unlike" : "like",
      });
    },
    [id, likeCommentMutation],
  );

  const handleCommentBookmark = useCallback(
    (comment: Comment) => {
      if (!id) return;
      triggerHaptic("light");
      bookmarkCommentMutation.mutate({
        commentId: comment.id,
        postId: id,
        action: comment.is_bookmarked ? "unbookmark" : "bookmark",
      });
    },
    [id, bookmarkCommentMutation],
  );

  const handleCommentShare = useCallback(async (comment: Comment) => {
    triggerHaptic("light");
    try {
      await Share.share({
        message: `${comment.author?.display_name || "Someone"} on Propian: "${comment.content}"`,
      });
    } catch (_) {}
  }, []);

  /* Post action handlers */
  const handleLike = useCallback(() => {
    if (!post) return;
    triggerHaptic("success");
    likePost.mutate({ postId: post.id, action: post.is_liked ? "unlike" : "like" });
  }, [post, likePost]);

  const handleBookmark = useCallback(() => {
    if (!post) return;
    triggerHaptic("success");
    bookmarkPost.mutate({
      postId: post.id,
      action: post.is_bookmarked ? "unbookmark" : "bookmark",
    });
  }, [post, bookmarkPost]);

  const handleRepost = useCallback(() => {
    if (!post) return;
    triggerHaptic("light");
    repostPost.mutate({
      postId: post.id,
      action: post.is_reposted ? "unrepost" : "repost",
    });
  }, [post, repostPost]);

  const handleShare = useCallback(async () => {
    if (!post) return;
    triggerHaptic("light");
    try {
      await Share.share({
        message: `Check out this post on Propian: https://propian.com/post/${post.id}`,
      });
    } catch (_) {}
  }, [post]);

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
            <IconVerified size={12} color={colors.lime} />
          )}
          <Text style={styles.commentDot}>·</Text>
          <Text style={styles.commentTime}>{timeAgo(comment.created_at)}</Text>
        </View>

        {/* Content */}
        <Text style={[styles.commentText, isRTLText(comment.content) && { textAlign: "right" }]}>{comment.content}</Text>

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
            <IconBookmark
              size={15}
              color={comment.is_bookmarked ? colors.lime : colors.g400}
            />
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

  /* ── Loading ── */
  if (isLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.loadingBody}>
          <View style={styles.loadingRow}>
            <Skeleton width={48} height={48} radius={24} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width={160} height={14} />
              <Skeleton width={120} height={12} />
            </View>
          </View>
          <Skeleton width="100%" height={14} />
          <Skeleton width="90%" height={14} />
          <Skeleton width="60%" height={14} />
          <View style={styles.divider} />
          <View style={styles.loadingRow}>
            <Skeleton width={32} height={32} radius={16} />
            <View style={{ flex: 1, gap: 4 }}>
              <Skeleton width={100} height={12} />
              <Skeleton width="80%" height={12} />
            </View>
          </View>
          <View style={styles.loadingRow}>
            <Skeleton width={32} height={32} radius={16} />
            <View style={{ flex: 1, gap: 4 }}>
              <Skeleton width={80} height={12} />
              <Skeleton width="70%" height={12} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (isError || !post) {
    return (
      <View style={styles.screen}>
        <View style={styles.errorBody}>
          <Text style={styles.errorEmoji}>🔍</Text>
          <Text style={styles.errorTitle}>Post not found</Text>
          <Text style={styles.errorDesc}>
            This post may have been deleted or doesn't exist.
          </Text>
        </View>
      </View>
    );
  }

  /* ── Render ── */
  const author = post.author;

  /* Post header as FlatList ListHeaderComponent */
  const postHeader = (
    <View style={styles.postSection}>
      {/* Author row */}
      <Pressable
        onPress={() => {
          if (author?.username) {
            router.push({
              pathname: "/profile/[username]",
              params: { username: author.username },
            });
          }
        }}
        style={styles.authorRow}
      >
        <Avatar
          src={author?.avatar_url}
          name={author?.display_name || ""}
          size="lg"
        />
        <View style={styles.authorInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName} numberOfLines={1}>
              {author?.display_name || "Unknown"}
            </Text>
            {author?.is_verified && <IconVerified size={16} color={colors.lime} />}
          </View>
          <Text style={styles.handle}>
            @{author?.username || "user"}{" "}
            <Text style={styles.dot}>·</Text>{" "}
            <Text style={styles.timestamp}>{timeAgo(post.created_at)}</Text>
          </Text>
        </View>
      </Pressable>

      {/* Sentiment tag */}
      {post.sentiment_tag && (
        <View style={styles.sentimentRow}>
          <Badge
            variant={
              post.sentiment_tag === "bullish"
                ? "green"
                : post.sentiment_tag === "bearish"
                  ? "red"
                  : "gray"
            }
          >
            {post.sentiment_tag.toUpperCase()}
          </Badge>
        </View>
      )}

      {/* Content */}
      {post.content ? (
        <Text style={[styles.content, isRTLText(post.content) && { textAlign: "right" }]}>{post.content}</Text>
      ) : null}

      {/* Chart embed (for type='chart') */}
      {post.type === "chart" && post.media_urls?.[0] && (() => {
        const chartRef = parseChartRef(post.media_urls[0]);
        if (!chartRef) return null;
        return (
          <Pressable
            style={styles.chartEmbed}
            onPress={() => {
              triggerHaptic("medium");
              router.push({
                pathname: "/chart/[symbol]" as any,
                params: { symbol: encodeURIComponent(post.media_urls[0]) },
              });
            }}
          >
            <WebView
              source={{ uri: buildMiniChartUrl(chartRef) }}
              style={styles.chartWebView}
              javaScriptEnabled
              domStorageEnabled
              scrollEnabled={false}
              pointerEvents="none"
            />
            <View style={styles.chartBadge}>
              <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M3 12l4-4 4 4 4-8 6 6"
                  stroke={colors.white}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={styles.chartBadgeText}>{formatChartLabel(chartRef)}</Text>
            </View>
          </Pressable>
        );
      })()}

      {/* Image embed (for type='image') — dynamic aspect ratio */}
      {post.type === "image" && post.media_urls?.[0] && (
        <DetailImageEmbed
          url={post.media_urls[0]}
          onPress={() => {
            triggerHaptic("light");
            setImageLightboxUrl(post.media_urls[0]);
          }}
        />
      )}

      {/* Quoted post embed */}
      {(post.type === "quote" || post.type === "repost") && post.quoted_post && (
        <Pressable
          style={({ pressed }) => [
            styles.quotedEmbed,
            pressed && styles.quotedEmbedPressed,
          ]}
          onPress={() => {
            router.push({
              pathname: "/post/[id]" as any,
              params: { id: post.quoted_post!.id },
            });
          }}
        >
          <View style={styles.quotedHeader}>
            <Avatar
              src={post.quoted_post.author?.avatar_url}
              name={post.quoted_post.author?.display_name || ""}
              size="sm"
            />
            <Text style={styles.quotedName} numberOfLines={1}>
              {post.quoted_post.author?.display_name || "Unknown"}
            </Text>
            {post.quoted_post.author?.is_verified && (
              <IconVerified size={12} color={colors.lime} />
            )}
            <Text style={styles.quotedHandle}>
              @{post.quoted_post.author?.username || "user"}
            </Text>
          </View>
          {post.quoted_post.content ? (
            <Text style={[styles.quotedContent, isRTLText(post.quoted_post.content) && { textAlign: "right" }]} numberOfLines={4}>
              {post.quoted_post.content}
            </Text>
          ) : null}
          {/* Quoted post media */}
          {post.quoted_post.type === "image" && post.quoted_post.media_urls?.[0] && (
            <View style={styles.quotedMedia}>
              <Image
                source={{ uri: post.quoted_post.media_urls[0] }}
                style={styles.quotedMediaImg}
                resizeMode="cover"
              />
            </View>
          )}
          {post.quoted_post.type === "chart" && post.quoted_post.media_urls?.[0] && (() => {
            const qRef = parseChartRef(post.quoted_post.media_urls[0]);
            if (!qRef) return null;
            return (
              <View style={styles.quotedMediaChart}>
                <WebView
                  source={{ uri: buildMiniChartUrl(qRef) }}
                  style={{ flex: 1 }}
                  javaScriptEnabled
                  domStorageEnabled
                  scrollEnabled={false}
                  pointerEvents="none"
                />
                <View style={styles.quotedMediaChartBadge}>
                  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                    <Path d="M3 12l4-4 4 4 4-8 6 6" stroke={colors.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text style={styles.quotedMediaChartBadgeText}>{formatChartLabel(qRef)}</Text>
                </View>
              </View>
            );
          })()}
        </Pressable>
      )}

      {/* Deleted quoted post */}
      {(post.type === "quote" || post.type === "repost") &&
        !post.quoted_post &&
        post.quoted_post_id && (
          <View style={styles.quotedDeleted}>
            <Text style={styles.quotedDeletedText}>
              This post is unavailable
            </Text>
          </View>
        )}

      {/* Engagement stats */}
      {(post.like_count > 0 || post.repost_count > 0 || post.view_count > 0) && (
        <View style={styles.statsRow}>
          {post.repost_count > 0 && (
            <Text style={styles.statText}>
              <Text style={styles.statNumber}>{formatCompact(post.repost_count)}</Text>
              {" Reposts"}
            </Text>
          )}
          {post.like_count > 0 && (
            <Text style={styles.statText}>
              <Text style={styles.statNumber}>{formatCompact(post.like_count)}</Text>
              {" Likes"}
            </Text>
          )}
          {post.view_count > 0 && (
            <Text style={styles.statText}>
              <Text style={styles.statNumber}>{formatCompact(post.view_count)}</Text>
              {" Views"}
            </Text>
          )}
        </View>
      )}

      {/* Post action bar */}
      <View style={styles.actionBar}>
        <Pressable
          style={styles.actionBtn}
          onPress={() => {
            triggerHaptic("light");
            setReplyTo(null);
            inputRef.current?.focus();
          }}
        >
          <IconComment size={20} color={colors.g400} />
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={handleRepost}>
          <IconRepost size={22} color={post.is_reposted ? colors.green : colors.g400} />
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={handleLike}>
          {post.is_liked ? (
            <IconHeart size={20} color={colors.red} />
          ) : (
            <IconHeartOutline size={20} color={colors.g400} />
          )}
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={handleBookmark}>
          <IconBookmark
            size={20}
            color={post.is_bookmarked ? colors.lime : colors.g400}
          />
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={handleShare}>
          <IconShare size={20} color={colors.g400} />
        </Pressable>
      </View>

      {/* Comments section header */}
      <View style={styles.commentsSectionHeader}>
        <Text style={styles.commentsSectionTitle}>
          {comments.length > 0 ? `Replies (${comments.length})` : "Replies"}
        </Text>
      </View>

      {/* Comments loading state */}
      {commentsQuery.isLoading && (
        <View style={styles.commentsLoading}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.commentSkeleton}>
              <Skeleton width={36} height={36} radius={18} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width={120} height={12} />
                <Skeleton width="85%" height={12} />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Empty state */}
      {!commentsQuery.isLoading && comments.length === 0 && (
        <View style={styles.emptyComments}>
          <IconComment size={32} color={colors.g200} />
          <Text style={styles.emptyTitle}>No replies yet</Text>
          <Text style={styles.emptyDesc}>
            Start the conversation — share your thoughts!
          </Text>
        </View>
      )}
    </View>
  );

  /* FlatList renderItem — comment with flat replies + view more */
  const renderItem = ({ item }: { item: Comment }) => renderCommentWithReplies(item);

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Main content */}
        <FlatList
          data={!commentsQuery.isLoading ? comments : []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={postHeader}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 80 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        {/* Sticky comment input */}
        <View
          style={[
            styles.inputBar,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
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
                style={[styles.input, isRTLText(commentText) && { textAlign: "right" }]}
                placeholder={replyTo ? `Reply to ${replyTo.authorName}...` : "Write a reply..."}
                placeholderTextColor={colors.g400}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
                returnKeyType="default"
              />
            </View>
          </View>
          <Pressable
            onPress={handleSendComment}
            disabled={!commentText.trim() || createComment.isPending}
            style={[
              styles.sendBtn,
              commentText.trim() && !createComment.isPending && styles.sendBtnActive,
            ]}
          >
            {createComment.isPending ? (
              <ActivityIndicator size="small" color={colors.black} />
            ) : (
              <IconSend
                size={18}
                color={commentText.trim() ? colors.black : colors.g400}
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Image Lightbox */}
      <Modal
        visible={!!imageLightboxUrl}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setImageLightboxUrl(null)}
        statusBarTranslucent
      >
        <View style={styles.lightboxScreen}>
          <Pressable
            style={styles.lightboxClose}
            onPress={() => {
              triggerHaptic("light");
              setImageLightboxUrl(null);
            }}
            hitSlop={12}
          >
            <IconClose size={22} color={colors.white} />
          </Pressable>
          {imageLightboxUrl && (
            <Image
              source={{ uri: imageLightboxUrl }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },

  /* Nav bar */
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
    backgroundColor: colors.white,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: colors.black,
  },

  /* Loading */
  loadingBody: {
    padding: 20,
    gap: 12,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.g100,
    marginVertical: 4,
  },

  /* Error */
  errorBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
    gap: 8,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  errorTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: colors.black,
  },
  errorDesc: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g400,
    textAlign: "center",
    paddingHorizontal: 40,
  },

  /* List */
  listContent: {
    flexGrow: 1,
  },

  /* Post section */
  postSection: {
    backgroundColor: colors.white,
  },

  /* Author */
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  authorInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  displayName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: colors.black,
    flexShrink: 1,
  },
  handle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g400,
    marginTop: 1,
  },
  dot: {
    color: colors.g300,
  },
  timestamp: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g400,
  },

  /* Sentiment */
  sentimentRow: {
    paddingHorizontal: 16,
    marginBottom: 6,
  },

  /* Content */
  content: {
    fontFamily: "Outfit_400Regular",
    fontSize: 17,
    color: colors.black,
    lineHeight: 26,
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  /* Quoted embed */
  quotedEmbed: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radii.lg,
    padding: 14,
    backgroundColor: colors.g50,
  },
  quotedEmbedPressed: {
    backgroundColor: colors.g100,
    borderColor: colors.g300,
  },
  quotedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  quotedName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: colors.black,
    flexShrink: 1,
  },
  quotedHandle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g400,
  },
  quotedContent: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g600,
    lineHeight: 20,
  },
  quotedMedia: {
    marginTop: 8,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.g100,
    height: 180,
  },
  quotedMediaImg: {
    width: "100%",
    height: "100%",
  },
  quotedMediaChart: {
    marginTop: 8,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.g800,
    height: 140,
    position: "relative" as const,
  },
  quotedMediaChartBadge: {
    position: "absolute" as const,
    bottom: 6,
    left: 6,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  quotedMediaChartBadgeText: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 10,
    color: colors.white,
  },
  quotedDeleted: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radii.lg,
    padding: 16,
    backgroundColor: colors.g100,
    alignItems: "center" as const,
  },
  quotedDeletedText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g400,
  },

  /* Stats row */
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.g100,
  },
  statText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g500,
  },
  statNumber: {
    fontFamily: "Outfit_700Bold",
    color: colors.black,
  },

  /* Action bar */
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.g100,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Comments section header */
  commentsSectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  commentsSectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: colors.black,
  },

  /* Comments loading */
  commentsLoading: {
    paddingHorizontal: 16,
    gap: 16,
    paddingBottom: 16,
  },
  commentSkeleton: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  /* Empty comments */
  emptyComments: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 40,
    gap: 6,
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
    paddingHorizontal: 16,
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
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.g100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Platform.OS === "ios" ? 0 : 2,
  },
  sendBtnActive: {
    backgroundColor: colors.lime,
  },

  /* Chart embed */
  chartEmbed: {
    height: 220,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.g100,
    position: "relative",
  },
  chartWebView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  chartBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  chartBadgeText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 11,
    color: colors.white,
    letterSpacing: 0.3,
  },

  /* Image embed (detail view) */
  imageEmbedDetail: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.g50,
  },
  imageEmbedDetailImg: {
    width: "100%",
    height: "100%",
  },

  /* Image lightbox */
  lightboxScreen: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxClose: {
    position: "absolute",
    top: 50,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  lightboxImage: {
    width: "100%",
    height: "100%",
  },
});
