import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatRoom, Message } from "../types";

export async function getRooms(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("chat_participants")
    .select(`
      room_id,
      last_read_at,
      room:chat_rooms!room_id(
        id, type, name, created_at
      )
    `)
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((p: any) => ({
    ...p.room,
    last_read_at: p.last_read_at,
  })) as ChatRoom[];
}

export async function getMessages(
  supabase: SupabaseClient,
  roomId: string,
  limit = 50,
  before?: string
) {
  let query = supabase
    .from("messages")
    .select("*, author:profiles!user_id(id, username, display_name, avatar_url, is_verified)")
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
  type: "text" | "image" = "text"
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, user_id: user.id, content, type })
    .select("*, author:profiles!user_id(id, username, display_name, avatar_url, is_verified)")
    .single();
  if (error) throw error;

  // Update last read
  await supabase
    .from("chat_participants")
    .update({ last_read_at: new Date().toISOString() })
    .match({ room_id: roomId, user_id: user.id });

  return data as Message;
}

export async function createDM(supabase: SupabaseClient, targetUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check for existing DM
  const { data: existing } = await supabase.rpc("find_dm_room", {
    user_a: user.id,
    user_b: targetUserId,
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
