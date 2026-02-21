import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatRoom, Message, ChannelReadState, StructuredTradeData } from "../types";

/* ─── Rooms ─── */

export async function getRooms(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("chat_participants")
    .select(`
      room_id,
      last_read_at,
      room:chat_rooms!room_id(
        id, type, name, created_at, community_id
      )
    `)
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });
  if (error) throw error;

  // Only return DM / non-community group rooms
  return (data ?? [])
    .map((p: any) => ({
      ...p.room,
      last_read_at: p.last_read_at,
    }))
    .filter((r: any) => !r.community_id) as ChatRoom[];
}

/* ─── Messages ─── */

export async function getMessages(
  supabase: SupabaseClient,
  roomId: string,
  limit = 50,
  before?: string
) {
  let query = supabase
    .from("messages")
    .select(`
      *,
      author:profiles!user_id(id, username, display_name, avatar_url, is_verified),
      reactions:message_reactions(
        id, message_id, user_id, emoji, created_at,
        user:profiles!user_id(id, username, display_name, avatar_url)
      )
    `)
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).reverse() as Message[];
}

export async function sendMessage(
  supabase: SupabaseClient,
  roomId: string,
  content: string,
  type: "text" | "image" = "text",
  options?: {
    ticker_mentions?: string[];
    structured_data?: StructuredTradeData;
  }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("messages")
    .insert({
      room_id: roomId,
      user_id: user.id,
      content,
      type,
      ...(options?.ticker_mentions && { ticker_mentions: options.ticker_mentions }),
      ...(options?.structured_data && { structured_data: options.structured_data }),
    })
    .select("*, author:profiles!user_id(id, username, display_name, avatar_url, is_verified)")
    .single();
  if (error) throw error;

  // Update last read for DM/group participants
  await supabase
    .from("chat_participants")
    .update({ last_read_at: new Date().toISOString() })
    .match({ room_id: roomId, user_id: user.id });

  return data as Message;
}

/* ─── DMs & Groups ─── */

export async function createDM(supabase: SupabaseClient, targetUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check for existing DM
  const { data: existing } = await supabase.rpc("find_dm_room", {
    target_user_id: targetUserId,
  });

  if (existing) return existing as string;

  const { data: room, error } = await supabase
    .from("chat_rooms")
    .insert({ type: "dm", created_by: user.id })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("chat_participants").insert([
    { room_id: room.id, user_id: user.id },
    { room_id: room.id, user_id: targetUserId },
  ]);

  return room.id as string;
}

export async function createGroup(supabase: SupabaseClient, name: string, memberIds: string[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: room, error } = await supabase
    .from("chat_rooms")
    .insert({ type: "group", name, created_by: user.id })
    .select()
    .single();
  if (error) throw error;

  const participants = [user.id, ...memberIds].map((uid) => ({
    room_id: room.id,
    user_id: uid,
  }));

  await supabase.from("chat_participants").insert(participants);

  return room.id as string;
}

/* ─── Channel Read State ─── */

export async function updateReadState(
  supabase: SupabaseClient,
  channelId: string,
  lastReadMessageId: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("channel_read_state")
    .upsert(
      {
        user_id: user.id,
        channel_id: channelId,
        last_read_message_id: lastReadMessageId,
        last_read_at: new Date().toISOString(),
        mention_count: 0,
      },
      { onConflict: "user_id,channel_id" }
    );
  if (error) throw error;
}

export async function getUnreadCounts(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("channel_read_state")
    .select("*")
    .eq("user_id", user.id);
  if (error) throw error;
  return (data ?? []) as ChannelReadState[];
}
