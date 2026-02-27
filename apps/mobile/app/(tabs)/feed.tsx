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
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, radii, spacing, shadows } from "@/theme";
import { supabase } from "@/lib/supabase";
import { triggerHaptic } from "@/hooks/useHaptics";
import { useFeed, useLikePost, useBookmark, useRepost, useCreatePost, useDeletePost, useUpdatePost, useCurrentProfile, useMutedIds, useBlockedIds, useNotifications } from "@propian/shared/hooks";
import type { FeedTab } from "@propian/shared/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { PostCard } from "@/components/feed/PostCard";
import { CommentSheet } from "@/components/feed/CommentSheet";
import { RepostMenu } from "@/components/feed/RepostMenu";
import { QuoteComposer } from "@/components/feed/QuoteComposer";
import { PostComposer } from "@/components/feed/PostComposer";
import { PostOptionsMenu } from "@/components/feed/PostOptionsMenu";
import { EmptyState, Skeleton, Avatar } from "@/components/ui";
import { IconPlus } from "@/components/icons/IconPlus";
import { IconHome } from "@/components/icons/IconHome";
import { IconSearch } from "@/components/icons/IconSearch";
import { IconBell } from "@/components/icons/IconBell";
import { IconPropianIcon } from "@/components/icons/IconPropianIcon";
import { IconClose } from "@/components/icons/IconClose";
import { IconUser } from "@/components/icons/IconUser";
import type { Post } from "@propian/shared/types";

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile } = useCurrentProfile(supabase, user?.id);
  const [activeTab, setActiveTab] = useState<FeedTab>("for-you");
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useFeed(supabase, activeTab);
  const { data: mutedIds } = useMutedIds(supabase);
  const { data: blockedData } = useBlockedIds(supabase);
  const { unreadCount } = useNotifications(supabase);
  const likeMutation = useLikePost(supabase);
  const bookmarkMutation = useBookmark(supabase);
  const repostMutation = useRepost(supabase);
  const createPostMutation = useCreatePost(supabase);
  const deletePostMutation = useDeletePost(supabase);
  const updatePostMutation = useUpdatePost(supabase);

  const [composerVisible, setComposerVisible] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [repostMenuPostId, setRepostMenuPostId] = useState<string | null>(null);
  const [quotePostId, setQuotePostId] = useState<string | null>(null);
  const [imageLightboxUrl, setImageLightboxUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [menuPost, setMenuPost] = useState<Post | null>(null);
  const [editPost, setEditPost] = useState<Post | null>(null);

  const excludedUserIds = useMemo(() => {
    const set = new Set<string>();
    (mutedIds ?? []).forEach((id) => set.add(id));
    (blockedData?.all ?? []).forEach((id) => set.add(id));
    return set;
  }, [mutedIds, blockedData]);

  const posts = useMemo(
    () =>
      (data?.pages.flatMap((page) => page.data ?? page) ?? []).filter(
        (post) => !excludedUserIds.has(post.user_id)
      ),
    [data, excludedUserIds]
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

  const handleMenuPress = useCallback((post: Post) => {
    setMenuPost(post);
  }, []);

  const handleDeletePost = useCallback((postId: string) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deletePostMutation.mutate(postId),
      },
    ]);
  }, [deletePostMutation]);

  const handleEditPost = useCallback((post: Post) => {
    setEditPost(post);
  }, []);

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
          onMenuPress={handleMenuPress}
        />
      </View>
    ),
    [handleLike, handleBookmark, handleRepostPress, handleComment, handleShare, handleImageExpand, handleMenuPress]
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
            <View>
              <IconBell size={22} color={colors.black} />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        </View>
      </View>

      {/* Feed Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === "for-you" && styles.tabActive]}
          onPress={() => setActiveTab("for-you")}
        >
          <Text style={[styles.tabText, activeTab === "for-you" && styles.tabTextActive]}>
            For You
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "following" && styles.tabActive]}
          onPress={() => setActiveTab("following")}
        >
          <Text style={[styles.tabText, activeTab === "following" && styles.tabTextActive]}>
            Following
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        ListEmptyComponent={
          activeTab === "following" ? (
            <EmptyState
              icon={<IconUser size={40} color={colors.g300} />}
              title="Your Following feed is empty"
              description="Follow some traders to see their posts here."
            />
          ) : (
            <EmptyState
              icon={<IconHome size={40} color={colors.g300} />}
              title="No posts yet"
              description="Be the first to share something with the community."
            />
          )
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

      {/* Post Options Menu */}
      <PostOptionsMenu
        visible={!!menuPost}
        post={menuPost}
        isOwnPost={!!menuPost && menuPost.user_id === user?.id}
        onClose={() => setMenuPost(null)}
        onDelete={handleDeletePost}
        onEdit={handleEditPost}
        onNotInterested={() => {}}
        onEmbed={() => {}}
      />

      {/* Post Composer (new post) */}
      <PostComposer
        visible={composerVisible}
        onClose={() => setComposerVisible(false)}
        onSubmit={handleCreatePost}
        isPending={createPostMutation.isPending}
        isUploadingImage={isUploadingImage}
        avatar={profile?.avatar_url}
        displayName={profile?.display_name}
      />

      {/* Post Composer (edit mode) */}
      <PostComposer
        visible={!!editPost}
        onClose={() => setEditPost(null)}
        onSubmit={(data) => {
          if (!editPost) return;
          updatePostMutation.mutate(
            { postId: editPost.id, updates: { content: data.content, sentiment_tag: data.sentiment_tag } },
            { onSuccess: () => setEditPost(null) }
          );
        }}
        isPending={updatePostMutation.isPending}
        avatar={profile?.avatar_url}
        displayName={profile?.display_name}
        initialContent={editPost?.content}
        initialSentiment={editPost?.sentiment_tag}
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
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.black,
  },
  tabText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: colors.g400,
  },
  tabTextActive: {
    color: colors.black,
    fontFamily: "Outfit_600SemiBold",
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 100,
    backgroundColor: colors.g100,
  },
  postWrapper: {
    backgroundColor: colors.white,
    marginBottom: 8,
  },
  loadingContainer: {
    backgroundColor: colors.white,
  },
  skeletonCard: {
    backgroundColor: colors.white,
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.g200,
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
  bellBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  bellBadgeText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 9,
    color: colors.white,
    lineHeight: 12,
  },
});
