import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatRoom, Message, ChannelReadState, StructuredTradeData } from "../types";

/** Shared select string for messages with author + reactions */
const MESSAGE_SELECT = `
  *,
  author:profiles!user_id(id, username, display_name, avatar_url, is_verified, pro_subscription_status),
  reactions:message_reactions(
    id, message_id, user_id, emoji, created_at,
    user:profiles!user_id(id, username, display_name, avatar_url)
  )
`;

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
    .select(MESSAGE_SELECT)
    .eq("room_id", roomId)
    .is("parent_message_id", null) // Only top-level messages
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).reverse() as Message[];
}

/* ─── Single Message (for realtime) ─── */

export async function getMessageById(supabase: SupabaseClient, messageId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("id", messageId)
    .single();
  if (error) throw error;
  return data as Message;
}

/* ─── Thread Replies ─── */

export async function getThreadReplies(
  supabase: SupabaseClient,
  parentMessageId: string,
  limit = 50
) {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("parent_message_id", parentMessageId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function sendMessage(
  supabase: SupabaseClient,
  roomId: string,
  content: string,
  type: "text" | "image" = "text",
  options?: {
    ticker_mentions?: string[];
    structured_data?: StructuredTradeData;
    parent_message_id?: string;
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
      ...(options?.parent_message_id && { parent_message_id: options.parent_message_id }),
    })
    .select("*, author:profiles!user_id(id, username, display_name, avatar_url, is_verified, pro_subscription_status)")
    .single();
  if (error) throw error;

  // Normalize response with empty reactions (just inserted, no reactions yet)
  const message = { ...data, reactions: [] } as Message;

  // Broadcast the message to the room channel so other clients receive it instantly.
  // This bypasses the slow postgres_changes RLS authorization bottleneck.
  const channel = supabase.channel(`room:${roomId}`);
  console.log("[RT] Broadcasting on", `room:${roomId}`, "channel state:", (channel as any).state);
  channel.send({
    type: "broadcast",
    event: "new-message",
    payload: message,
  }).then((status) => {
    console.log("[RT] Broadcast result:", status);
  }).catch((err) => {
    console.error("[RT] Broadcast error:", err);
  });

  // Update last read for DM/group participants
  await supabase
    .from("chat_participants")
    .update({ last_read_at: new Date().toISOString() })
    .match({ room_id: roomId, user_id: user.id });

  return message;
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

export interface UnreadCountRow {
  channel_id: string;
  unread_count: number;
  mention_count: number;
}

export async function getUnreadCounts(supabase: SupabaseClient): Promise<UnreadCountRow[]> {
  const { data, error } = await supabase.rpc("get_unread_counts");
  if (error) throw error;
  return (data ?? []) as UnreadCountRow[];
}

/** Legacy: raw read-state rows */
export async function getReadStates(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("channel_read_state")
    .select("*")
    .eq("user_id", user.id);
  if (error) throw error;
  return (data ?? []) as ChannelReadState[];
}
