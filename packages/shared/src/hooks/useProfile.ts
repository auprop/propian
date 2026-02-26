"use client";

import { useEffect, useRef } from "react";
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

const PROFILE_CACHE_KEY = "propian:my-profile";
const PROFILE_COOKIE_NAME = "propian-profile";

function getCachedProfile(): Profile | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : undefined;
  } catch {
    return undefined;
  }
}

function setCachedProfile(profile: Profile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    // storage full or unavailable — ignore
  }
  // Also set a lightweight cookie so the profile is available server-side for SSR
  // (eliminates the avatar/name flash on page refresh)
  try {
    if (typeof document !== "undefined") {
      const mini = JSON.stringify({
        avatar_url: profile.avatar_url,
        display_name: profile.display_name,
        username: profile.username,
      });
      document.cookie = `${PROFILE_COOKIE_NAME}=${encodeURIComponent(mini)}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
    }
  } catch {
    // cookie write failed — ignore
  }
}

/** Clear all profile caches (localStorage + cookie). Call on sign-out. */
export function clearProfileCache() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {}
  try {
    if (typeof document !== "undefined") {
      document.cookie = `${PROFILE_COOKIE_NAME}=; path=/; max-age=0`;
    }
  } catch {}
}

export function useCurrentProfile(supabase: SupabaseClient, userId?: string) {
  const queryClient = useQueryClient();
  const seeded = useRef(false);

  // After hydration, seed the query cache from localStorage so
  // the profile is available instantly (before the network fetch).
  useEffect(() => {
    if (seeded.current || !userId) return;
    seeded.current = true;
    const cached = getCachedProfile();
    if (cached) {
      queryClient.setQueryData(["profile", "me", userId], cached);
    }
  }, [userId, queryClient]);

  return useQuery({
    queryKey: ["profile", "me", userId],
    queryFn: async () => {
      const profile = await profilesApi.getProfileById(supabase, userId!);
      if (profile) setCachedProfile(profile);
      return profile;
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateProfile(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<Pick<Profile, "display_name" | "username" | "bio" | "website" | "location" | "trading_style" | "experience_level" | "avatar_url">>) =>
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
