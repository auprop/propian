import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "@/theme";
import { triggerHaptic } from "@/hooks/useHaptics";
import { Avatar, Badge, Card } from "@/components/ui";
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
import type { Post } from "@propian/shared/types";

interface PostCardProps {
  post: Post;
  onLike: (postId: string, action: "like" | "unlike") => void;
  onBookmark: (postId: string, action: "bookmark" | "unbookmark") => void;
  onRepost?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
}

export function PostCard({ post, onLike, onBookmark, onRepost, onComment, onShare }: PostCardProps) {
  const router = useRouter();

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
                <IconVerified size={14} color={colors.lime} />
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
        <Text style={styles.content}>{original.content}</Text>

        {/* Action Bar — actions target the original post */}
        <View style={styles.actionBar}>
          <Pressable
            style={styles.actionButton}
            onPress={() => {
              triggerHaptic("light");
              onComment?.(original.id);
            }}
          >
            <IconComment size={16} color={colors.g400} />
            {original.comment_count > 0 && (
              <Text style={styles.actionCount}>
                {formatCompact(original.comment_count)}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => {
              triggerHaptic("light");
              onRepost?.(original.id);
            }}
          >
            <IconRepost
              size={20}
              color={original.is_reposted ? colors.green : colors.g400}
            />
            {original.repost_count > 0 && (
              <Text style={[styles.actionCount, original.is_reposted && styles.actionCountRepost]}>
                {formatCompact(original.repost_count)}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => {
              triggerHaptic("success");
              onLike(original.id, original.is_liked ? "unlike" : "like");
            }}
          >
            {original.is_liked ? (
              <IconHeart size={17} color={colors.red} />
            ) : (
              <IconHeartOutline size={17} color={colors.g400} />
            )}
            {original.like_count > 0 && (
              <Text style={[styles.actionCount, original.is_liked && styles.actionCountLike]}>
                {formatCompact(original.like_count)}
              </Text>
            )}
          </Pressable>

          <View style={styles.actionButton}>
            <IconEye size={18} color={colors.g400} />
            {original.view_count > 0 && (
              <Text style={styles.actionCount}>
                {formatCompact(original.view_count)}
              </Text>
            )}
          </View>

          <Pressable
            style={styles.actionButton}
            onPress={() => {
              triggerHaptic("success");
              onBookmark(original.id, original.is_bookmarked ? "unbookmark" : "bookmark");
            }}
          >
            <IconBookmark
              size={17}
              color={original.is_bookmarked ? colors.lime : colors.g400}
            />
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => {
              triggerHaptic("light");
              onShare?.(original.id);
            }}
          >
            <IconShare size={19} color={colors.g400} />
          </Pressable>
        </View>
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

  const handleProfilePress = () => {
    if (author?.username) {
      router.push({ pathname: "/profile/[username]", params: { username: author.username } });
    }
  };

  return (
    <Card>
      {/* Header */}
      <Pressable onPress={handleProfilePress} style={styles.header}>
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
              <IconVerified size={14} color={colors.lime} />
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

      {/* Quoted post embed (for type='quote') */}
      {post.type === "quote" && post.quoted_post && (
        <View style={styles.quotedEmbed}>
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
          <Text style={styles.quotedEmbedContent} numberOfLines={3}>
            {post.quoted_post.content}
          </Text>
        </View>
      )}

      {/* Deleted quoted post fallback */}
      {post.type === "quote" && !post.quoted_post && (
        <View style={styles.quotedEmbedDeleted}>
          <Text style={styles.quotedEmbedDeletedText}>This post is unavailable</Text>
        </View>
      )}

      {/* Action Bar — X/Twitter order: Comment, Repost, Heart, Views, Bookmark, Share */}
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

        {/* Views */}
        <View style={styles.actionButton}>
          <IconEye size={18} color={colors.g400} />
          {post.view_count > 0 && (
            <Text style={styles.actionCount}>
              {formatCompact(post.view_count)}
            </Text>
          )}
        </View>

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
    </Card>
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
});
