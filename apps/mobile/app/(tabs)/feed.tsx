import { useState, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
  Text,
  Share,
  Modal,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, radii, spacing, shadows } from "@/theme";
import { supabase } from "@/lib/supabase";
import { triggerHaptic } from "@/hooks/useHaptics";
import { useFeed, useLikePost, useBookmark, useRepost, useCreatePost, useCurrentProfile } from "@propian/shared/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { PostCard } from "@/components/feed/PostCard";
import { CommentSheet } from "@/components/feed/CommentSheet";
import { RepostMenu } from "@/components/feed/RepostMenu";
import { QuoteComposer } from "@/components/feed/QuoteComposer";
import { PostComposer } from "@/components/feed/PostComposer";
import { EmptyState, Skeleton, Avatar } from "@/components/ui";
import { IconPlus } from "@/components/icons/IconPlus";
import { IconHome } from "@/components/icons/IconHome";
import { IconSearch } from "@/components/icons/IconSearch";
import { IconBell } from "@/components/icons/IconBell";
import { IconPropianIcon } from "@/components/icons/IconPropianIcon";
import { IconClose } from "@/components/icons/IconClose";
import type { Post } from "@propian/shared/types";

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile } = useCurrentProfile(supabase, user?.id);
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useFeed(supabase);
  const likeMutation = useLikePost(supabase);
  const bookmarkMutation = useBookmark(supabase);
  const repostMutation = useRepost(supabase);
  const createPostMutation = useCreatePost(supabase);

  const [composerVisible, setComposerVisible] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [repostMenuPostId, setRepostMenuPostId] = useState<string | null>(null);
  const [quotePostId, setQuotePostId] = useState<string | null>(null);
  const [imageLightboxUrl, setImageLightboxUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const posts = useMemo(
    () => data?.pages.flatMap((page) => page.data ?? page) ?? [],
    [data]
  );

  const handleLike = useCallback(
    (postId: string, action: "like" | "unlike") => {
      likeMutation.mutate({ postId, action });
    },
    [likeMutation]
  );

  const handleBookmark = useCallback(
    (postId: string, action: "bookmark" | "unbookmark") => {
      bookmarkMutation.mutate({ postId, action });
    },
    [bookmarkMutation]
  );

  const handleRepostPress = useCallback((postId: string) => {
    setRepostMenuPostId(postId);
  }, []);

  const handleSimpleRepost = useCallback(() => {
    if (!repostMenuPostId) return;
    const post = posts.find((p) => p.id === repostMenuPostId);
    repostMutation.mutate({
      postId: repostMenuPostId,
      action: post?.is_reposted ? "unrepost" : "repost",
    });
  }, [repostMenuPostId, posts, repostMutation]);

  const handleQuoteRepost = useCallback(() => {
    setQuotePostId(repostMenuPostId);
    setRepostMenuPostId(null);
  }, [repostMenuPostId]);

  const handleQuoteSubmit = useCallback(
    (data: { content: string; sentiment_tag?: "bullish" | "bearish" | "neutral" | null }) => {
      if (!quotePostId) return;
      createPostMutation.mutate(
        {
          content: data.content,
          type: "quote",
          quoted_post_id: quotePostId,
          ...(data.sentiment_tag ? { sentiment_tag: data.sentiment_tag } : {}),
        },
        { onSuccess: () => setQuotePostId(null) }
      );
    },
    [quotePostId, createPostMutation]
  );

  const handleComment = useCallback((postId: string) => {
    setCommentPostId(postId);
  }, []);

  const handleShare = useCallback(async (postId: string) => {
    try {
      await Share.share({
        message: `Check out this post on Propian: https://propian.com/post/${postId}`,
      });
    } catch (_) {}
  }, []);

  const handleCreatePost = useCallback(
    async (data: {
      content: string;
      sentiment_tag?: "bullish" | "bearish" | "neutral" | null;
      type?: "text" | "chart" | "image";
      media_urls?: string[];
      imageAsset?: { uri: string; base64: string | null; mimeType: string } | null;
    }) => {
      let finalType = data.type;
      let finalMediaUrls = data.media_urls;

      // Handle image upload before creating post
      if (data.imageAsset) {
        setIsUploadingImage(true);
        try {
          const { uploadPostImage } = await import("@propian/shared/api");
          const url = await uploadPostImage(supabase, {
            base64: data.imageAsset.base64 ?? undefined,
            type: data.imageAsset.mimeType,
          });
          finalType = "image";
          finalMediaUrls = [url];
        } catch (err) {
          console.error("[Propian] Image upload error:", err);
          setIsUploadingImage(false);
          return;
        }
        setIsUploadingImage(false);
      }

      createPostMutation.mutate(
        {
          content: data.content,
          sentiment_tag: data.sentiment_tag,
          ...(finalType ? { type: finalType } : {}),
          ...(finalMediaUrls ? { media_urls: finalMediaUrls } : {}),
        },
        {
          onSuccess: () => {
            setComposerVisible(false);
          },
        }
      );
    },
    [createPostMutation, supabase]
  );

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleImageExpand = useCallback((url: string) => {
    setImageLightboxUrl(url);
  }, []);

  const renderPost = useCallback(
    ({ item }: { item: Post }) => (
      <View style={styles.postWrapper}>
        <PostCard
          post={item}
          onLike={handleLike}
          onBookmark={handleBookmark}
          onRepost={handleRepostPress}
          onComment={handleComment}
          onShare={handleShare}
          onImageExpand={handleImageExpand}
        />
      </View>
    ),
    [handleLike, handleBookmark, handleRepostPress, handleComment, handleShare, handleImageExpand]
  );

  if (isLoading) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.feedHeader}>
          <Pressable
            onPress={() => {
              if (profile?.username) {
                router.push({ pathname: "/profile/[username]", params: { username: profile.username } });
              }
            }}
            style={styles.feedHeaderLeft}
            hitSlop={8}
          >
            <Avatar
              src={profile?.avatar_url}
              name={profile?.display_name || ""}
              size="sm"
            />
          </Pressable>
          <IconPropianIcon size={32} />
          <View style={styles.feedHeaderActions}>
            <Pressable onPress={() => router.push("/search")} hitSlop={8}>
              <IconSearch size={22} color={colors.black} />
            </Pressable>
            <Pressable onPress={() => router.push("/notifications")} hitSlop={8}>
              <IconBell size={22} color={colors.black} />
            </Pressable>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonHeader}>
                <Skeleton width={40} height={40} radius={20} />
                <View style={styles.skeletonText}>
                  <Skeleton width={120} height={14} />
                  <Skeleton width={80} height={12} />
                </View>
              </View>
              <Skeleton height={60} />
              <Skeleton width="60%" height={14} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.feedHeader}>
        <Pressable
          onPress={() => {
            if (profile?.username) {
              router.push({ pathname: "/profile/[username]", params: { username: profile.username } });
            }
          }}
          style={styles.feedHeaderLeft}
          hitSlop={8}
        >
          <Avatar
            src={profile?.avatar_url}
            name={profile?.display_name || ""}
            size="sm"
          />
        </Pressable>
        <IconPropianIcon size={32} />
        <View style={styles.feedHeaderActions}>
          <Pressable onPress={() => router.push("/search")} hitSlop={8}>
            <IconSearch size={22} color={colors.black} />
          </Pressable>
          <Pressable onPress={() => router.push("/notifications")} hitSlop={8}>
            <IconBell size={22} color={colors.black} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        ListEmptyComponent={
          <EmptyState
            icon={<IconHome size={40} color={colors.g300} />}
            title="No posts yet"
            description="Be the first to share something with the community."
          />
        }
        contentContainerStyle={styles.listContent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.lime}
            colors={[colors.lime]}
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <Skeleton width={200} height={14} />
            </View>
          ) : null
        }
      />

      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={() => {
          triggerHaptic("medium");
          setComposerVisible(true);
        }}
      >
        <IconPlus size={24} color={colors.black} />
      </Pressable>

      {/* Comment Sheet */}
      <CommentSheet
        visible={!!commentPostId}
        postId={commentPostId ?? ""}
        onClose={() => setCommentPostId(null)}
      />

      {/* Repost Menu */}
      <RepostMenu
        visible={!!repostMenuPostId}
        isReposted={!!posts.find((p) => p.id === repostMenuPostId)?.is_reposted}
        onRepost={handleSimpleRepost}
        onQuote={handleQuoteRepost}
        onClose={() => setRepostMenuPostId(null)}
      />

      {/* Quote Composer */}
      <QuoteComposer
        visible={!!quotePostId}
        quotedPost={posts.find((p) => p.id === quotePostId) ?? null}
        onSubmit={handleQuoteSubmit}
        onClose={() => setQuotePostId(null)}
        isPending={createPostMutation.isPending}
        avatar={profile?.avatar_url}
        displayName={profile?.display_name}
      />

      {/* Post Composer */}
      <PostComposer
        visible={composerVisible}
        onClose={() => setComposerVisible(false)}
        onSubmit={handleCreatePost}
        isPending={createPostMutation.isPending}
        isUploadingImage={isUploadingImage}
        avatar={profile?.avatar_url}
        displayName={profile?.display_name}
      />

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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  feedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  feedHeaderLeft: {
    width: 64,
  },
  feedHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 18,
    width: 64,
  },
  listContent: {
    paddingBottom: 100,
    backgroundColor: colors.g50,
  },
  postWrapper: {
    padding: spacing.base,
    paddingBottom: 0,
  },
  loadingContainer: {
    padding: spacing.base,
    gap: 16,
    backgroundColor: colors.g50,
  },
  skeletonCard: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.lg,
    padding: 16,
    gap: 12,
    ...shadows.sm,
  },
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  skeletonText: {
    gap: 6,
  },
  footerLoader: {
    alignItems: "center",
    paddingVertical: 20,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.lime,
    borderWidth: 2,
    borderColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.md,
  },
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
