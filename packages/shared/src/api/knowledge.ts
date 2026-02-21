import type { SupabaseClient } from "@supabase/supabase-js";
import type { KnowledgePin } from "../types";

/** Get knowledge pins for a community, optionally filtered by category. */
export async function getKnowledgePins(
  supabase: SupabaseClient,
  communityId: string,
  category?: string
) {
  let query = supabase
    .from("knowledge_pins")
    .select(`
      *,
      message:messages!message_id(
        id, room_id, user_id, content, type, created_at, ticker_mentions, structured_data,
        author:profiles!user_id(id, username, display_name, avatar_url, is_verified)
      ),
      pinner:profiles!pinned_by(id, username, display_name, avatar_url, is_verified),
      channel:chat_rooms!channel_id(id, name, channel_type)
    `)
    .eq("community_id", communityId)
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as KnowledgePin[];
}

/** Pin a message to the community knowledge library. */
export async function pinMessage(
  supabase: SupabaseClient,
  communityId: string,
  channelId: string,
  messageId: string,
  category?: string,
  tags?: string[]
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("knowledge_pins")
    .insert({
      community_id: communityId,
      channel_id: channelId,
      message_id: messageId,
      pinned_by: user.id,
      category: category || null,
      tags: tags || null,
    })
    .select()
    .single();
  if (error) throw error;

  // Mark the message as pinned
  await supabase
    .from("messages")
    .update({ is_pinned_to_library: true })
    .eq("id", messageId);

  return data as KnowledgePin;
}

/** Unpin a message from the knowledge library. */
export async function unpinMessage(supabase: SupabaseClient, pinId: string) {
  // Get the pin first to update the message
  const { data: pin } = await supabase
    .from("knowledge_pins")
    .select("message_id")
    .eq("id", pinId)
    .single();

  const { error } = await supabase
    .from("knowledge_pins")
    .delete()
    .eq("id", pinId);
  if (error) throw error;

  // Check if there are other pins for this message
  if (pin) {
    const { count } = await supabase
      .from("knowledge_pins")
      .select("id", { count: "exact", head: true })
      .eq("message_id", pin.message_id);

    if (count === 0) {
      await supabase
        .from("messages")
        .update({ is_pinned_to_library: false })
        .eq("id", pin.message_id);
    }
  }
}

/** Update a pin's category and tags. */
export async function updatePin(
  supabase: SupabaseClient,
  pinId: string,
  updates: { category?: string; tags?: string[] }
) {
  const { data, error } = await supabase
    .from("knowledge_pins")
    .update({
      ...(updates.category !== undefined && { category: updates.category }),
      ...(updates.tags !== undefined && { tags: updates.tags }),
    })
    .eq("id", pinId)
    .select()
    .single();
  if (error) throw error;
  return data as KnowledgePin;
}
