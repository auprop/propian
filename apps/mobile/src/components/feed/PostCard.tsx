import { useState, useEffect } from "react";
import { View, Text, Pressable, Image, StyleSheet, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { colors } from "@/theme";
import { triggerHaptic } from "@/hooks/useHaptics";
import { Avatar, Badge, Card } from "@/components/ui";
import { IconHeart } from "@/components/icons/IconHeart";
import { IconHeartOutline } from "@/components/icons/IconHeartOutline";
import { IconComment } from "@/components/icons/IconComment";
import { IconRepost } from "@/components/icons/IconRepost";
import { IconShare } from "@/components/icons/IconShare";
import { IconBookmark } from "@/components/icons/IconBookmark";
import { IconVerified } from "@/components/icons/IconVerified";
import { formatCompact } from "@propian/shared/utils";
import { timeAgo } from "@propian/shared/utils";
import { parseChartRef, buildMiniChartUrl, formatChartLabel } from "@propian/shared/utils";
import { isRTLText } from "@propian/shared/utils";
import Svg, { Path } from "react-native-svg";
import type { Post } from "@propian/shared/types";

/* ─── Inline chart icon ─── */
function IconChartLine({ size = 16, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12l4-4 4 4 4-8 6 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ─── Chart Embed (mini chart thumbnail) ─── */
function ChartEmbed({ post }: { post: Post }) {
  const router = useRouter();
  const chartUrl = post.media_urls?.[0];
  if (!chartUrl) return null;

  const ref = parseChartRef(chartUrl);
  if (!ref) return null;

  const label = formatChartLabel(ref);
  const miniUrl = buildMiniChartUrl(ref);

  return (
    <Pressable
      style={styles.chartEmbed}
      onPress={() => {
        triggerHaptic("medium");
        router.push({
          pathname: "/chart/[symbol]" as any,
          params: { symbol: encodeURIComponent(chartUrl) },
        });
      }}
    >
      <WebView
        source={{ uri: miniUrl }}
        style={styles.chartWebView}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        pointerEvents="none"
      />
      {/* Badge overlay */}
      <View style={styles.chartBadge}>
        <IconChartLine size={12} color={colors.white} />
        <Text style={styles.chartBadgeText}>{label}</Text>
      </View>
    </Pressable>
  );
}

/* ─── Image Embed (X-style dynamic aspect ratio) ─── */
const IMG_MIN_H = 160;
const IMG_MAX_H = 580;
const IMG_FALLBACK_H = 280;

function ImageEmbed({ post, onPress }: { post: Post; onPress: (url: string) => void }) {
  const imageUrl = post.media_urls?.[0];
  const { width: screenWidth } = useWindowDimensions();
  const [imgHeight, setImgHeight] = useState(IMG_FALLBACK_H);

  // Card has 16px outer padding + 16px inner padding on each side = 64px total
  const containerWidth = screenWidth - 64;

  useEffect(() => {
    if (!imageUrl) return;
    Image.getSize(
      imageUrl,
      (w, h) => {
        const ratio = w / h;
        const natural = containerWidth / ratio;
        setImgHeight(Math.round(Math.min(Math.max(natural, IMG_MIN_H), IMG_MAX_H)));
      },
      () => setImgHeight(IMG_FALLBACK_H),
    );
  }, [imageUrl, containerWidth]);

  if (!imageUrl) return null;

  return (
    <Pressable
      style={[styles.imageEmbed, { height: imgHeight }]}
      onPress={() => {
        triggerHaptic("light");
        onPress(imageUrl);
      }}
    >
      <Image
        source={{ uri: imageUrl }}
        style={styles.imageEmbedImg}
        resizeMode="cover"
      />
    </Pressable>
  );
}

interface PostCardProps {
  post: Post;
  onLike: (postId: string, action: "like" | "unlike") => void;
  onBookmark: (postId: string, action: "bookmark" | "unbookmark") => void;
  onRepost?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onImageExpand?: (url: string) => void;
}

export function PostCard({ post, onLike, onBookmark, onRepost, onComment, onShare, onImageExpand }: PostCardProps) {
  const router = useRouter();

  const navigateToPost = (postId: string) => {
    router.push({ pathname: "/post/[id]" as any, params: { id: postId } });
  };

  // For simple reposts, show the original post with a "reposted by" header
  if (post.type === "repost" && post.quoted_post) {
    const original = post.quoted_post;
    const reposter = post.author;
    const originalAuthor = original.author;

    return (
      <Card>
        {/* Reposted by header */}
        <View style={styles.repostHeader}>
          <IconRepost size={14} color={colors.green} />
          <Text style={styles.repostHeaderText}>
            {reposter?.display_name || "Someone"} reposted
          </Text>
        </View>

        {/* Tappable content area → navigates to original post */}
        <Pressable onPress={() => navigateToPost(original.id)}>
          {/* Original post header */}
          <Pressable
            onPress={() => {
              if (originalAuthor?.username) {
                router.push({ pathname: "/profile/[username]", params: { username: originalAuthor.username } });
              }
            }}
            style={styles.header}
          >
            <Avatar
              src={originalAuthor?.avatar_url}
              name={originalAuthor?.display_name || ""}
              size="md"
            />
            <View style={styles.headerText}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName} numberOfLines={1}>
                  {originalAuthor?.display_name || "Unknown"}
                </Text>
                {originalAuthor?.is_verified && (
                  <IconVerified size={14} />
                )}
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.handle}>@{originalAuthor?.username || "user"}</Text>
                <Text style={styles.dot}>-</Text>
                <Text style={styles.timestamp}>{timeAgo(original.created_at)}</Text>
              </View>
            </View>
          </Pressable>

          {/* Sentiment tag */}
          {original.sentiment_tag && (
            <Badge
              variant={
                original.sentiment_tag === "bullish"
                  ? "green"
                  : original.sentiment_tag === "bearish"
                    ? "red"
                    : "gray"
              }
              style={styles.sentimentBadge}
            >
              {original.sentiment_tag.toUpperCase()}
            </Badge>
          )}

          {/* Original content */}
          <Text style={[styles.content, isRTLText(original.content) && { textAlign: "right" }]}>{original.content}</Text>
        </Pressable>

        {/* Action Bar — actions target the original post */}
        <ActionBar
          post={original}
          onComment={onComment}
          onRepost={onRepost}
          onLike={onLike}
          onBookmark={onBookmark}
          onShare={onShare}
        />
      </Card>
    );
  }

  // For simple reposts where original was deleted
  if (post.type === "repost" && !post.quoted_post) {
    return (
      <Card>
        <View style={styles.repostHeader}>
          <IconRepost size={14} color={colors.green} />
          <Text style={styles.repostHeaderText}>
            {post.author?.display_name || "Someone"} reposted
          </Text>
        </View>
        <View style={styles.quotedEmbedDeleted}>
          <Text style={styles.quotedEmbedDeletedText}>This post is unavailable</Text>
        </View>
      </Card>
    );
  }

  // Regular post (text, image, poll, quote)
  const author = post.author;

  return (
    <Card>
      {/* Tappable content area → navigates to post detail */}
      <Pressable onPress={() => navigateToPost(post.id)}>
        {/* Header — avatar taps to profile */}
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
            size="md"
          />
          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName} numberOfLines={1}>
                {author?.display_name || "Unknown"}
              </Text>
              {author?.is_verified && (
                <IconVerified size={14} />
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
          <Text style={[styles.content, isRTLText(post.content) && { textAlign: "right" }]}>{post.content}</Text>
        ) : null}

        {/* Chart embed (for type='chart') */}
        {post.type === "chart" && <ChartEmbed post={post} />}

        {/* Image embed (for type='image') */}
        {post.type === "image" && post.media_urls?.length > 0 && (
          <ImageEmbed post={post} onPress={onImageExpand ?? (() => {})} />
        )}

        {/* Quoted post embed (for type='quote') */}
        {post.type === "quote" && post.quoted_post && (
          <Pressable
            style={({ pressed }) => [styles.quotedEmbed, pressed && styles.quotedEmbedPressed]}
            onPress={() => navigateToPost(post.quoted_post!.id)}
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
                    <IconVerified size={12} />
                  )}
                </View>
                <Text style={styles.quotedEmbedHandle}>
                  @{post.quoted_post.author?.username || "user"}
                </Text>
              </View>
            </View>
            {post.quoted_post.content ? (
              <Text style={[styles.quotedEmbedContent, isRTLText(post.quoted_post.content) && { textAlign: "right" }]} numberOfLines={3}>
                {post.quoted_post.content}
              </Text>
            ) : null}
            {/* Quoted post media (image or chart) */}
            {post.quoted_post.type === "image" && post.quoted_post.media_urls?.[0] && (
              <View style={styles.quotedEmbedMedia}>
                <Image
                  source={{ uri: post.quoted_post.media_urls[0] }}
                  style={styles.quotedEmbedMediaImg}
                  resizeMode="cover"
                />
              </View>
            )}
            {post.quoted_post.type === "chart" && post.quoted_post.media_urls?.[0] && (() => {
              const qRef = parseChartRef(post.quoted_post.media_urls[0]);
              if (!qRef) return null;
              const qLabel = formatChartLabel(qRef);
              const qMiniUrl = buildMiniChartUrl(qRef);
              return (
                <View style={styles.quotedEmbedMedia}>
                  <WebView
                    source={{ uri: qMiniUrl }}
                    style={styles.quotedEmbedChartWebView}
                    javaScriptEnabled
                    domStorageEnabled
                    scrollEnabled={false}
                    pointerEvents="none"
                  />
                  <View style={styles.quotedEmbedChartBadge}>
                    <IconChartLine size={10} color={colors.white} />
                    <Text style={styles.quotedEmbedChartBadgeText}>{qLabel}</Text>
                  </View>
                </View>
              );
            })()}
          </Pressable>
        )}

        {/* Deleted quoted post fallback */}
        {post.type === "quote" && !post.quoted_post && (
          <View style={styles.quotedEmbedDeleted}>
            <Text style={styles.quotedEmbedDeletedText}>This post is unavailable</Text>
          </View>
        )}
      </Pressable>

      {/* Action Bar */}
      <ActionBar
        post={post}
        onComment={onComment}
        onRepost={onRepost}
        onLike={onLike}
        onBookmark={onBookmark}
        onShare={onShare}
      />
    </Card>
  );
}

/* ─── Action Bar (extracted to avoid duplication) ─── */
function ActionBar({
  post,
  onComment,
  onRepost,
  onLike,
  onBookmark,
  onShare,
}: {
  post: Post;
  onComment?: (postId: string) => void;
  onRepost?: (postId: string) => void;
  onLike: (postId: string, action: "like" | "unlike") => void;
  onBookmark: (postId: string, action: "bookmark" | "unbookmark") => void;
  onShare?: (postId: string) => void;
}) {
  return (
    <View style={styles.actionBar}>
      {/* Comment */}
      <Pressable
        style={styles.actionButton}
        onPress={() => {
          triggerHaptic("light");
          onComment?.(post.id);
        }}
      >
        <IconComment size={16} color={colors.g400} />
        {post.comment_count > 0 && (
          <Text style={styles.actionCount}>
            {formatCompact(post.comment_count)}
          </Text>
        )}
      </Pressable>

      {/* Repost */}
      <Pressable
        style={styles.actionButton}
        onPress={() => {
          triggerHaptic("light");
          onRepost?.(post.id);
        }}
      >
        <IconRepost
          size={20}
          color={post.is_reposted ? colors.green : colors.g400}
        />
        {post.repost_count > 0 && (
          <Text style={[styles.actionCount, post.is_reposted && styles.actionCountRepost]}>
            {formatCompact(post.repost_count)}
          </Text>
        )}
      </Pressable>

      {/* Like */}
      <Pressable
        style={styles.actionButton}
        onPress={() => {
          triggerHaptic("success");
          onLike(post.id, post.is_liked ? "unlike" : "like");
        }}
      >
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

      {/* Bookmark */}
      <Pressable
        style={styles.actionButton}
        onPress={() => {
          triggerHaptic("success");
          onBookmark(post.id, post.is_bookmarked ? "unbookmark" : "bookmark");
        }}
      >
        <IconBookmark
          size={17}
          color={post.is_bookmarked ? colors.lime : colors.g400}
        />
      </Pressable>

      {/* Share */}
      <Pressable
        style={styles.actionButton}
        onPress={() => {
          triggerHaptic("light");
          onShare?.(post.id);
        }}
      >
        <IconShare size={19} color={colors.g400} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  repostHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    paddingLeft: 4,
  },
  repostHeaderText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: colors.g500,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
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
    fontSize: 15,
    color: colors.black,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  handle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g500,
  },
  dot: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g400,
  },
  timestamp: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g400,
  },
  sentimentBadge: {
    marginBottom: 8,
  },
  content: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: colors.black,
    lineHeight: 22,
    marginBottom: 14,
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
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
  quotedEmbedMedia: {
    marginTop: 8,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.g100,
    height: 180,
  },
  quotedEmbedMediaImg: {
    width: "100%",
    height: "100%",
  },
  quotedEmbedChartWebView: {
    flex: 1,
  },
  quotedEmbedChartBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  quotedEmbedChartBadgeText: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 10,
    color: colors.white,
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

  /* Image embed (height set dynamically via style prop) */
  imageEmbed: {
    marginBottom: 14,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.g100,
  },
  imageEmbedImg: {
    width: "100%",
    height: "100%",
  },

  /* Chart embed */
  chartEmbed: {
    height: 180,
    marginBottom: 14,
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
});
