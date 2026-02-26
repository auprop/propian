import type { SupabaseClient } from "@supabase/supabase-js";
import type { MessageReaction } from "../types";

/**
 * Batch fetch reactions for a list of message IDs.
 * Returns a map: messageId → MessageReaction[]
 */
export async function getReactionsForMessages(
  supabase: SupabaseClient,
  messageIds: string[]
): Promise<Record<string, MessageReaction[]>> {
  if (messageIds.length === 0) return {};

  const { data, error } = await supabase
    .from("message_reactions")
    .select(`
      *,
      user:profiles!user_id(id, username, display_name, avatar_url, is_verified, pro_subscription_status)
    `)
    .in("message_id", messageIds)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const map: Record<string, MessageReaction[]> = {};
  for (const reaction of (data ?? []) as MessageReaction[]) {
    if (!map[reaction.message_id]) map[reaction.message_id] = [];
    map[reaction.message_id].push(reaction);
  }
  return map;
}

/** Add a reaction to a message. */
export async function addReaction(
  supabase: SupabaseClient,
  messageId: string,
  emoji: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("message_reactions")
    .insert({ message_id: messageId, user_id: user.id, emoji })
    .select(`
      *,
      user:profiles!user_id(id, username, display_name, avatar_url, is_verified, pro_subscription_status)
    `)
    .single();
  if (error) throw error;
  return data as MessageReaction;
}

/** Remove the current user's reaction from a message. */
export async function removeReaction(
  supabase: SupabaseClient,
  messageId: string,
  emoji: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("message_reactions")
    .delete()
    .match({ message_id: messageId, user_id: user.id, emoji });
  if (error) throw error;
}
