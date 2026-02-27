import type { SupabaseClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ */
/*  Mute                                                               */
/* ------------------------------------------------------------------ */

export async function muteUser(supabase: SupabaseClient, targetUserId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("user_mutes")
    .insert({ user_id: user.id, muted_id: targetUserId });
  if (error) throw error;
}

export async function unmuteUser(supabase: SupabaseClient, targetUserId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("user_mutes")
    .delete()
    .match({ user_id: user.id, muted_id: targetUserId });
  if (error) throw error;
}

export async function getMuteStatus(supabase: SupabaseClient, targetUserId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("user_mutes")
    .select("user_id")
    .match({ user_id: user.id, muted_id: targetUserId })
    .maybeSingle();
  return !!data;
}

export async function getMutedUserIds(supabase: SupabaseClient): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("user_mutes")
    .select("muted_id")
    .eq("user_id", user.id);
  return (data ?? []).map((r: any) => r.muted_id);
}

/* ------------------------------------------------------------------ */
/*  Block                                                              */
/* ------------------------------------------------------------------ */

export async function blockUser(supabase: SupabaseClient, targetUserId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("user_blocks")
    .insert({ user_id: user.id, blocked_id: targetUserId });
  if (error) throw error;
}

export async function unblockUser(supabase: SupabaseClient, targetUserId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .match({ user_id: user.id, blocked_id: targetUserId });
  if (error) throw error;
}

export async function getBlockStatus(supabase: SupabaseClient, targetUserId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("user_blocks")
    .select("user_id")
    .match({ user_id: user.id, blocked_id: targetUserId })
    .maybeSingle();
  return !!data;
}

export async function getBlockedUserIds(supabase: SupabaseClient): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("user_blocks")
    .select("blocked_id")
    .eq("user_id", user.id);
  return (data ?? []).map((r: any) => r.blocked_id);
}

export async function getBlockedByUserIds(supabase: SupabaseClient): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("user_blocks")
    .select("user_id")
    .eq("blocked_id", user.id);
  return (data ?? []).map((r: any) => r.user_id);
}
