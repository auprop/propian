"use client";

import { useEffect } from "react";
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Post, Comment } from "../types";
import * as postsApi from "../api/posts";

/* ------------------------------------------------------------------ */
/*  Feed tab type                                                      */
/* ------------------------------------------------------------------ */

export type FeedTab = "for-you" | "following";

const FEED_TABS: FeedTab[] = ["for-you", "following"];

/* ------------------------------------------------------------------ */
/*  Helper: optimistically update a post in the infinite feed cache    */
/* ------------------------------------------------------------------ */

function updatePostInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  updater: (post: Post) => Post
) {
  // Update in all feed tabs
  for (const tab of FEED_TABS) {
    queryClient.setQueryData(["feed", tab], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          data: Array.isArray(page.data)
            ? page.data.map((post: Post) => (post.id === postId ? updater(post) : post))
            : page.data,
        })),
      };
    });
  }
  // Update single-post detail cache
  queryClient.setQueryData(["post", postId], (old: any) => {
    if (!old) return old;
    return updater(old);
  });
  // Update user-posts cache (all keys)
  queryClient.getQueriesData({ queryKey: ["userPosts"] }).forEach(([key]) => {
    queryClient.setQueryData(key, (old: any) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          data: Array.isArray(page.data)
            ? page.data.map((post: Post) => (post.id === postId ? updater(post) : post))
            : page.data,
        })),
      };
    });
  });
}

function saveFeedCaches(queryClient: ReturnType<typeof useQueryClient>) {
  return {
    forYou: queryClient.getQueryData(["feed", "for-you"]),
    following: queryClient.getQueryData(["feed", "following"]),
  };
}

function restoreFeedCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  saved: { forYou: unknown; following: unknown }
) {
  if (saved.forYou) queryClient.setQueryData(["feed", "for-you"], saved.forYou);
  if (saved.following) queryClient.setQueryData(["feed", "following"], saved.following);
}

/* ------------------------------------------------------------------ */
/*  Feed query                                                         */
/* ------------------------------------------------------------------ */

export function useFeed(supabase: SupabaseClient, tab: FeedTab = "for-you") {
  const queryClient = useQueryClient();

  // Realtime: live post count updates (likes, comments, reposts from other users)
  useEffect(() => {
    const channel = supabase
      .channel("feed-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload) => {
          const u = payload.new as any;
          // Only touch counts — don't overwrite optimistic is_liked etc.
          for (const t of FEED_TABS) {
            queryClient.setQueryData(["feed", t], (old: any) => {
              if (!old) return old;
              return {
                ...old,
                pages: old.pages.map((page: any) => ({
                  ...page,
                  data: Array.isArray(page.data)
                    ? page.data.map((post: Post) =>
                        post.id === u.id
                          ? {
                              ...post,
                              like_count: u.like_count,
                              comment_count: u.comment_count,
                              repost_count: u.repost_count,
                              share_count: u.share_count,
                            }
                          : post
                      )
                    : page.data,
                })),
              };
            });
          }
          // Also update single-post cache
          queryClient.setQueryData(["post", u.id], (old: any) => {
            if (!old) return old;
            return {
              ...old,
              like_count: u.like_count,
              comment_count: u.comment_count,
              repost_count: u.repost_count,
              share_count: u.share_count,
            };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        () => {
          // New post appeared — mark stale so next navigation refetches
          queryClient.invalidateQueries({ queryKey: ["feed"], refetchType: "none" });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  return useInfiniteQuery({
    queryKey: ["feed", tab],
    queryFn: ({ pageParam }) =>
      tab === "following"
        ? postsApi.getFollowingFeedPosts(supabase, pageParam)
        : postsApi.getFeedPosts(supabase, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/* ------------------------------------------------------------------ */
/*  User posts                                                         */
/* ------------------------------------------------------------------ */

export function useUserPosts(supabase: SupabaseClient, userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["userPosts", userId],
    queryFn: ({ pageParam }) => postsApi.getUserPosts(supabase, userId!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!userId,
  });
}

/* ------------------------------------------------------------------ */
/*  Single post                                                        */
/* ------------------------------------------------------------------ */

export function usePost(supabase: SupabaseClient, postId: string | undefined) {
  return useQuery({
    queryKey: ["post", postId],
    queryFn: () => postsApi.getPostById(supabase, postId!),
    enabled: !!postId,
  });
}

/* ------------------------------------------------------------------ */
/*  Create post                                                        */
/* ------------------------------------------------------------------ */

export function useCreatePost(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (post: { content: string; type?: string; sentiment_tag?: string | null; media_urls?: string[]; quoted_post_id?: string | null }) =>
      postsApi.createPost(supabase, post),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Delete post                                                        */
/* ------------------------------------------------------------------ */

export function useDeletePost(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => postsApi.deletePost(supabase, postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["userPosts"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Update post                                                        */
/* ------------------------------------------------------------------ */

export function useUpdatePost(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, updates }: { postId: string; updates: { content: string; sentiment_tag?: string | null } }) =>
      postsApi.updatePost(supabase, postId, updates),
    onSuccess: (updatedPost) => {
      updatePostInCache(queryClient, updatedPost.id, () => updatedPost);
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["userPosts"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Like / Unlike                                                      */
/* ------------------------------------------------------------------ */

export function useLikePost(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, action }: { postId: string; action: "like" | "unlike" }) =>
      action === "like" ? postsApi.likePost(supabase, postId) : postsApi.unlikePost(supabase, postId),
    onMutate: async ({ postId, action }) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      const previousFeeds = saveFeedCaches(queryClient);
      updatePostInCache(queryClient, postId, (post) => ({
        ...post,
        is_liked: action === "like",
        like_count: Math.max(0, post.like_count + (action === "like" ? 1 : -1)),
      }));
      return { previousFeeds };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFeeds) restoreFeedCaches(queryClient, context.previousFeeds);
    },
    // No onSettled invalidation — optimistic update + Realtime handle this.
    // Invalidating would trigger a slow full refetch that overwrites the instant UI update.
  });
}

/* ------------------------------------------------------------------ */
/*  Comments                                                           */
/* ------------------------------------------------------------------ */

export function useComments(supabase: SupabaseClient, postId: string) {
  return {
    query: useInfiniteQuery({
      queryKey: ["comments", postId],
      queryFn: () => postsApi.getComments(supabase, postId),
      initialPageParam: undefined,
      getNextPageParam: () => undefined,
      enabled: !!postId,
    }),
  };
}

export function useCreateComment(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, content, parentId }: { postId: string; content: string; parentId?: string | null }) =>
      postsApi.createComment(supabase, postId, content, parentId),
    onMutate: async ({ postId }) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      const previousFeeds = saveFeedCaches(queryClient);
      updatePostInCache(queryClient, postId, (post) => ({
        ...post,
        comment_count: post.comment_count + 1,
      }));
      return { previousFeeds };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFeeds) restoreFeedCaches(queryClient, context.previousFeeds);
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.postId] });
      // Feed comment_count updated via Realtime — no need to refetch entire feed
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Bookmark                                                           */
/* ------------------------------------------------------------------ */

export function useBookmark(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, action }: { postId: string; action: "bookmark" | "unbookmark" }) =>
      action === "bookmark" ? postsApi.bookmarkPost(supabase, postId) : postsApi.unbookmarkPost(supabase, postId),
    onMutate: async ({ postId, action }) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      const previousFeeds = saveFeedCaches(queryClient);
      updatePostInCache(queryClient, postId, (post) => ({
        ...post,
        is_bookmarked: action === "bookmark",
      }));
      return { previousFeeds };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFeeds) restoreFeedCaches(queryClient, context.previousFeeds);
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Repost                                                             */
/* ------------------------------------------------------------------ */

export function useRepost(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { postId: string; action: "repost" | "unrepost" }, { previousFeeds: { forYou: unknown; following: unknown } }>({
    mutationFn: async ({ postId, action }) => {
      if (action === "repost") {
        await postsApi.repostPost(supabase, postId);
      } else {
        await postsApi.unrepostPost(supabase, postId);
      }
    },
    onMutate: async ({ postId, action }) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      const previousFeeds = saveFeedCaches(queryClient);
      updatePostInCache(queryClient, postId, (post) => ({
        ...post,
        is_reposted: action === "repost",
        repost_count: Math.max(0, post.repost_count + (action === "repost" ? 1 : -1)),
      }));
      return { previousFeeds };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFeeds) restoreFeedCaches(queryClient, context.previousFeeds);
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Comment interactions                                               */
/* ------------------------------------------------------------------ */

function updateCommentInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  commentId: string,
  updater: (comment: Comment) => Comment
) {
  queryClient.setQueryData(["comments", postId], (old: any) => {
    if (!old) return old;
    const updateComment = (c: any): any => {
      if (c.id === commentId) return updater(c);
      if (c.replies) return { ...c, replies: c.replies.map(updateComment) };
      return c;
    };
    return {
      ...old,
      pages: old.pages.map((page: any) =>
        Array.isArray(page) ? page.map(updateComment) : page
      ),
    };
  });
}

export function useLikeComment(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, action }: { commentId: string; postId: string; action: "like" | "unlike" }) =>
      action === "like" ? postsApi.likeComment(supabase, commentId) : postsApi.unlikeComment(supabase, commentId),
    onMutate: async ({ commentId, postId, action }) => {
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });
      const previousComments = queryClient.getQueryData(["comments", postId]);
      updateCommentInCache(queryClient, postId, commentId, (comment) => ({
        ...comment,
        is_liked: action === "like",
        like_count: Math.max(0, comment.like_count + (action === "like" ? 1 : -1)),
      }));
      return { previousComments };
    },
    onError: (_err, vars, context) => {
      if (context?.previousComments) queryClient.setQueryData(["comments", vars.postId], context.previousComments);
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.postId] });
    },
  });
}

export function useBookmarkComment(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, action }: { commentId: string; postId: string; action: "bookmark" | "unbookmark" }) =>
      action === "bookmark" ? postsApi.bookmarkComment(supabase, commentId) : postsApi.unbookmarkComment(supabase, commentId),
    onMutate: async ({ commentId, postId, action }) => {
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });
      const previousComments = queryClient.getQueryData(["comments", postId]);
      updateCommentInCache(queryClient, postId, commentId, (comment) => ({
        ...comment,
        is_bookmarked: action === "bookmark",
      }));
      return { previousComments };
    },
    onError: (_err, vars, context) => {
      if (context?.previousComments) queryClient.setQueryData(["comments", vars.postId], context.previousComments);
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.postId] });
    },
  });
}
