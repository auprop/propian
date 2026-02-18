"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "../types";
import * as profilesApi from "../api/profiles";

export function useProfile(supabase: SupabaseClient, username: string) {
  return useQuery({
    queryKey: ["profile", username],
    queryFn: () => profilesApi.getProfile(supabase, username),
    enabled: !!username,
    staleTime: 5 * 60_000, // 5 min — profile data rarely changes
  });
}

export function useCurrentProfile(supabase: SupabaseClient, userId?: string) {
  return useQuery({
    queryKey: ["profile", "me", userId],
    queryFn: () => profilesApi.getProfileById(supabase, userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000, // 5 min — own profile rarely changes
  });
}

export function useUpdateProfile(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<Pick<Profile, "display_name" | "username" | "bio" | "trading_style" | "experience_level" | "avatar_url">>) =>
      profilesApi.updateProfile(supabase, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useUploadAvatar(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: { uri?: string; base64?: string; blob?: Blob; type?: string }) =>
      profilesApi.uploadAvatar(supabase, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useFollowStatus(supabase: SupabaseClient, targetUserId: string) {
  return useQuery({
    queryKey: ["follow-status", targetUserId],
    queryFn: () => profilesApi.getFollowStatus(supabase, targetUserId),
    enabled: !!targetUserId,
  });
}

export function useFollow(supabase: SupabaseClient) {
  const queryClient = useQueryClient();

  const followMutation = useMutation({
    mutationFn: (targetUserId: string) => profilesApi.followUser(supabase, targetUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["follow-status"] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (targetUserId: string) => profilesApi.unfollowUser(supabase, targetUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["follow-status"] });
    },
  });

  return { follow: followMutation, unfollow: unfollowMutation };
}
