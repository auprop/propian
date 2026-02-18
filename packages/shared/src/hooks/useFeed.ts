"use client";

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Post, Comment } from "../types";
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
  return useMutation<void, Error, { postId: string; action: "repost" | "unrepost" }, { previousFeed: unknown }>({
    mutationFn: async ({ postId, action }) => {
      if (action === "repost") {
        await postsApi.repostPost(supabase, postId);
      } else {
        await postsApi.unrepostPost(supabase, postId);
      }
    },
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
