"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as postsApi from "../api/posts";

export function useFeed(supabase: SupabaseClient) {
  return useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) => postsApi.getFeedPosts(supabase, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useCreatePost(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (post: { content: string; type?: string; sentiment_tag?: string | null; media_urls?: string[] }) =>
      postsApi.createPost(supabase, post),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useLikePost(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, action }: { postId: string; action: "like" | "unlike" }) =>
      action === "like" ? postsApi.likePost(supabase, postId) : postsApi.unlikePost(supabase, postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.postId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useBookmark(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, action }: { postId: string; action: "bookmark" | "unbookmark" }) =>
      action === "bookmark" ? postsApi.bookmarkPost(supabase, postId) : postsApi.unbookmarkPost(supabase, postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}
