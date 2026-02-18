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
  onRepost?: (postId: string, action: "repost" | "unrepost") => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
}

export function PostCard({ post, onLike, onBookmark, onRepost, onComment, onShare }: PostCardProps) {
  const router = useRouter();
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
      <Text style={styles.content}>{post.content}</Text>

      {/* Action Bar — X/Twitter order: Comment, Repost, Heart, Views, Bookmark, Share */}
      <View style={styles.actionBar}>
        {/* Comment — viewBox 32, dense paths → size 16 */}
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

        {/* Repost — viewBox 32, medium density → size 18 */}
        <Pressable
          style={styles.actionButton}
          onPress={() => {
            triggerHaptic("light");
            onRepost?.(post.id, post.is_reposted ? "unrepost" : "repost");
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

        {/* Like — viewBox 24, very dense → size 17 */}
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

        {/* Views — viewBox 24, sparse → size 18 */}
        <View style={styles.actionButton}>
          <IconEye size={18} color={colors.g400} />
          {post.view_count > 0 && (
            <Text style={styles.actionCount}>
              {formatCompact(post.view_count)}
            </Text>
          )}
        </View>

        {/* Bookmark — viewBox 24, tall/narrow → size 17 */}
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

        {/* Share — viewBox 48, very sparse → size 22 */}
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
});
