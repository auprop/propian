import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserPreferences } from "../types";

export async function getPreferences(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;

  // If no row exists yet, insert default row
  if (!data) {
    const { data: created, error: insertError } = await supabase
      .from("user_preferences")
      .insert({ user_id: user.id })
      .select()
      .single();
    if (insertError) throw insertError;
    return created as UserPreferences;
  }

  return data as UserPreferences;
}

export async function updatePreferences(
  supabase: SupabaseClient,
  updates: Partial<Omit<UserPreferences, "user_id" | "updated_at">>
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("user_preferences")
    .update(updates)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) throw error;
  return data as UserPreferences;
}
