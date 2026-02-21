"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as communitiesApi from "../api/communities";

/* ─── Queries ─── */

export function useCommunities(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["communities"],
    queryFn: () => communitiesApi.getCommunities(supabase),
    staleTime: 5 * 60_000,
  });
}

export function useCommunity(supabase: SupabaseClient, slug: string) {
  return useQuery({
    queryKey: ["community", slug],
    queryFn: () => communitiesApi.getCommunity(supabase, slug),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useCommunityChannels(supabase: SupabaseClient, communityId: string) {
  return useQuery({
    queryKey: ["community-channels", communityId],
    queryFn: () => communitiesApi.getCommunityChannels(supabase, communityId),
    enabled: !!communityId,
    staleTime: 2 * 60_000,
  });
}

export function useCommunityMembers(supabase: SupabaseClient, communityId: string) {
  return useQuery({
    queryKey: ["community-members", communityId],
    queryFn: () => communitiesApi.getCommunityMembers(supabase, communityId),
    enabled: !!communityId,
    staleTime: 2 * 60_000,
  });
}

export function useCommunityCategories(supabase: SupabaseClient, communityId: string) {
  return useQuery({
    queryKey: ["community-categories", communityId],
    queryFn: () => communitiesApi.getCommunityCategories(supabase, communityId),
    enabled: !!communityId,
    staleTime: 5 * 60_000,
  });
}

export function useCommunityRoles(supabase: SupabaseClient, communityId: string) {
  return useQuery({
    queryKey: ["community-roles", communityId],
    queryFn: () => communitiesApi.getCommunityRoles(supabase, communityId),
    enabled: !!communityId,
    staleTime: 5 * 60_000,
  });
}

/* ─── Mutations ─── */

export function useCreateCommunity(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug: string; description?: string }) =>
      communitiesApi.createCommunity(supabase, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
  });
}

export function useUpdateCommunity(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ communityId, updates }: { communityId: string; updates: Parameters<typeof communitiesApi.updateCommunity>[2] }) =>
      communitiesApi.updateCommunity(supabase, communityId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      queryClient.invalidateQueries({ queryKey: ["community"] });
    },
  });
}

export function useDeleteCommunity(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (communityId: string) =>
      communitiesApi.deleteCommunity(supabase, communityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
  });
}

export function useCreateChannel(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ communityId, data }: { communityId: string; data: Parameters<typeof communitiesApi.createChannel>[2] }) =>
      communitiesApi.createChannel(supabase, communityId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["community-channels", variables.communityId] });
    },
  });
}

export function useUpdateChannel(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, updates }: { channelId: string; updates: Parameters<typeof communitiesApi.updateChannel>[2] }) =>
      communitiesApi.updateChannel(supabase, channelId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-channels"] });
    },
  });
}

export function useDeleteChannel(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) =>
      communitiesApi.deleteChannel(supabase, channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-channels"] });
    },
  });
}

export function useJoinCommunity(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (communityId: string) =>
      communitiesApi.joinCommunity(supabase, communityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      queryClient.invalidateQueries({ queryKey: ["community-members"] });
    },
  });
}

export function useLeaveCommunity(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (communityId: string) =>
      communitiesApi.leaveCommunity(supabase, communityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      queryClient.invalidateQueries({ queryKey: ["community-members"] });
    },
  });
}

export function useCreateCategory(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ communityId, name, position }: { communityId: string; name: string; position?: number }) =>
      communitiesApi.createCategory(supabase, communityId, name, position),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["community-categories", variables.communityId] });
    },
  });
}
