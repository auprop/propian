import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors, fontFamily, radii, spacing, shadows } from "@/theme";
import { triggerHaptic } from "@/hooks/useHaptics";
import { Avatar, Badge, Card } from "@/components/ui";
import { IconHeart } from "@/components/icons/IconHeart";
import { IconHeartOutline } from "@/components/icons/IconHeartOutline";
import { IconComment } from "@/components/icons/IconComment";
import { IconShare } from "@/components/icons/IconShare";
import { IconBookmark } from "@/components/icons/IconBookmark";
import { IconVerified } from "@/components/icons/IconVerified";
import { formatCompact } from "@propian/shared/utils";
import { timeAgo } from "@propian/shared/utils";
import type { Post } from "@propian/shared/types";

interface PostCardProps {
  post: Post;
  onLike: (postId: string, action: "like" | "unlike") => void;
  onBookmark: (postId: string, action: "bookmark" | "unbookmark") => void;
  onShare?: (postId: string) => void;
}

export function PostCard({ post, onLike, onBookmark, onShare }: PostCardProps) {
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

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <Pressable
          style={styles.actionButton}
          onPress={() => {
            triggerHaptic("success");
            onLike(post.id, post.is_liked ? "unlike" : "like");
          }}
        >
          {post.is_liked ? (
            <IconHeart size={18} color={colors.red} />
          ) : (
            <IconHeartOutline size={18} color={colors.g400} />
          )}
          {post.like_count > 0 && (
            <Text style={[styles.actionCount, post.is_liked && styles.actionCountActive]}>
              {formatCompact(post.like_count)}
            </Text>
          )}
        </Pressable>

        <Pressable style={styles.actionButton}>
          <IconComment size={18} color={colors.g400} />
          {post.comment_count > 0 && (
            <Text style={styles.actionCount}>
              {formatCompact(post.comment_count)}
            </Text>
          )}
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={() => {
            triggerHaptic("light");
            onShare?.(post.id);
          }}
        >
          <IconShare size={18} color={colors.g400} />
          {post.share_count > 0 && (
            <Text style={styles.actionCount}>
              {formatCompact(post.share_count)}
            </Text>
          )}
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={() => {
            triggerHaptic("success");
            onBookmark(post.id, post.is_bookmarked ? "unbookmark" : "bookmark");
          }}
        >
          <IconBookmark
            size={18}
            color={post.is_bookmarked ? colors.lime : colors.g400}
          />
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
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionCount: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: colors.g500,
  },
  actionCountActive: {
    color: colors.red,
  },
});
