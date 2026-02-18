import { useState, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
  Modal,
  Text,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, fontFamily, radii, spacing, shadows } from "@/theme";
import { supabase } from "@/lib/supabase";
import { triggerHaptic } from "@/hooks/useHaptics";
import { useFeed, useLikePost, useBookmark, useRepost, useCreatePost, useCurrentProfile } from "@propian/shared/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { PostCard } from "@/components/feed/PostCard";
import { TrendingBar } from "@/components/feed/TrendingBar";
import { Button, Textarea, EmptyState, Skeleton } from "@/components/ui";
import { IconPlus } from "@/components/icons/IconPlus";
import { IconClose } from "@/components/icons/IconClose";
import { IconHome } from "@/components/icons/IconHome";
import { IconSearch } from "@/components/icons/IconSearch";
import { IconBell } from "@/components/icons/IconBell";
import { IconPropianLogo } from "@/components/icons/IconPropianLogo";
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
  const [postContent, setPostContent] = useState("");

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

  const handleRepost = useCallback(
    (postId: string, action: "repost" | "unrepost") => {
      repostMutation.mutate({ postId, action });
    },
    [repostMutation]
  );

  const handleCreatePost = () => {
    if (!postContent.trim()) return;
    createPostMutation.mutate(
      { content: postContent.trim() },
      {
        onSuccess: () => {
          setPostContent("");
          setComposerVisible(false);
        },
      }
    );
  };

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderPost = useCallback(
    ({ item }: { item: Post }) => (
      <View style={styles.postWrapper}>
        <PostCard
          post={item}
          onLike={handleLike}
          onBookmark={handleBookmark}
          onRepost={handleRepost}
        />
      </View>
    ),
    [handleLike, handleBookmark, handleRepost]
  );

  if (isLoading) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.feedHeader}>
          <IconPropianLogo height={22} />
          <View style={styles.feedHeaderActions}>
            <Pressable onPress={() => router.push("/search")}>
              <IconSearch size={22} color={colors.black} />
            </Pressable>
            <Pressable onPress={() => router.push("/notifications")}>
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
        <Text style={styles.feedHeaderTitle}>Propian</Text>
        <View style={styles.feedHeaderActions}>
          <Pressable onPress={() => router.push("/search")}>
            <IconSearch size={22} color={colors.black} />
          </Pressable>
          <Pressable onPress={() => router.push("/notifications")}>
            <IconBell size={22} color={colors.black} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        ListHeaderComponent={<TrendingBar />}
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

      {/* Composer Modal */}
      <Modal
        visible={composerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setComposerVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={[styles.modalSafe, { paddingTop: insets.top }]}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setComposerVisible(false)}>
                <IconClose size={24} color={colors.black} />
              </Pressable>
              <Text style={styles.modalTitle}>New Post</Text>
              <Button
                variant="primary"
                size="sm"
                noIcon
                onPress={handleCreatePost}
                disabled={!postContent.trim() || createPostMutation.isPending}
              >
                {createPostMutation.isPending ? "Posting..." : "Post"}
              </Button>
            </View>
            <Textarea
              placeholder="What's on your mind, trader?"
              value={postContent}
              onChangeText={setPostContent}
              style={styles.composerInput}
              autoFocus
            />
          </View>
        </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
  },
  feedHeaderTitle: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 24,
    color: colors.black,
    letterSpacing: -0.5,
  },
  feedHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
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
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalSafe: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
  },
  modalTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: colors.black,
  },
  composerInput: {
    borderWidth: 0,
    borderRadius: 0,
    fontSize: 16,
    minHeight: 200,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
});
