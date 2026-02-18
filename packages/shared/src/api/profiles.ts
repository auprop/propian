import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "../types";

export async function getProfile(supabase: SupabaseClient, username: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function getProfileById(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(
  supabase: SupabaseClient,
  updates: Partial<Pick<Profile, "display_name" | "username" | "bio" | "trading_style" | "experience_level" | "avatar_url">>
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function followUser(supabase: SupabaseClient, targetUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, following_id: targetUserId });
  if (error) throw error;
}

export async function unfollowUser(supabase: SupabaseClient, targetUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("follows")
    .delete()
    .match({ follower_id: user.id, following_id: targetUserId });
  if (error) throw error;
}

export async function getFollowStatus(supabase: SupabaseClient, targetUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "not_following" as const;
  if (user.id === targetUserId) return "self" as const;

  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .match({ follower_id: user.id, following_id: targetUserId })
    .maybeSingle();

  return data ? ("following" as const) : ("not_following" as const);
}
