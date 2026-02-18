"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Post } from "../types";
import * as postsApi from "../api/posts";

/* ------------------------------------------------------------------ */
/*  Helper: optimistically update a post in the infinite feed cache    */
/* ------------------------------------------------------------------ */

function updatePostInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  updater: (post: Post) => Post
) {
  queryClient.setQueryData(["feed"], (old: any) => {
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

/* ------------------------------------------------------------------ */
/*  Feed query                                                         */
/* ------------------------------------------------------------------ */

export function useFeed(supabase: SupabaseClient) {
  return useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) => postsApi.getFeedPosts(supabase, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
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
/*  Like / Unlike                                                      */
/* ------------------------------------------------------------------ */

export function useLikePost(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, action }: { postId: string; action: "like" | "unlike" }) =>
      action === "like" ? postsApi.likePost(supabase, postId) : postsApi.unlikePost(supabase, postId),
    onMutate: async ({ postId, action }) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      const previousFeed = queryClient.getQueryData(["feed"]);
      updatePostInCache(queryClient, postId, (post) => ({
        ...post,
        is_liked: action === "like",
        like_count: Math.max(0, post.like_count + (action === "like" ? 1 : -1)),
      }));
      return { previousFeed };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFeed) queryClient.setQueryData(["feed"], context.previousFeed);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
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
      const previousFeed = queryClient.getQueryData(["feed"]);
      updatePostInCache(queryClient, postId, (post) => ({
        ...post,
        comment_count: post.comment_count + 1,
      }));
      return { previousFeed };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFeed) queryClient.setQueryData(["feed"], context.previousFeed);
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.postId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
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
      const previousFeed = queryClient.getQueryData(["feed"]);
      updatePostInCache(queryClient, postId, (post) => ({
        ...post,
        is_bookmarked: action === "bookmark",
      }));
      return { previousFeed };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFeed) queryClient.setQueryData(["feed"], context.previousFeed);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Repost                                                             */
/* ------------------------------------------------------------------ */

export function useRepost(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, action }: { postId: string; action: "repost" | "unrepost" }) =>
      action === "repost" ? postsApi.repostPost(supabase, postId) : postsApi.unrepostPost(supabase, postId),
    onMutate: async ({ postId, action }) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      const previousFeed = queryClient.getQueryData(["feed"]);
      updatePostInCache(queryClient, postId, (post) => ({
        ...post,
        is_reposted: action === "repost",
        repost_count: Math.max(0, post.repost_count + (action === "repost" ? 1 : -1)),
      }));
      return { previousFeed };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFeed) queryClient.setQueryData(["feed"], context.previousFeed);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}
