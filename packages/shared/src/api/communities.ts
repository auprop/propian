import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Community,
  CommunityCategory,
  CommunityMember,
  CommunityRole,
  ChatRoom,
} from "../types";

/* ─── Communities ─── */

export async function getCommunities(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Community[];
}

export async function getCommunity(supabase: SupabaseClient, slug: string) {
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return data as Community;
}

export async function createCommunity(
  supabase: SupabaseClient,
  data: { name: string; slug: string; description?: string }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Create the community
  const { data: community, error } = await supabase
    .from("communities")
    .insert({
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      owner_id: user.id,
      settings: { is_public: true, allow_member_pins: false, default_notification_level: "mentions" },
    })
    .select()
    .single();
  if (error) throw error;

  // Create default role
  const { data: role } = await supabase
    .from("community_roles")
    .insert({
      community_id: community.id,
      name: "Member",
      permissions: { can_send_messages: true },
      position: 0,
      is_default: true,
    })
    .select()
    .single();

  // Create "General" category
  const { data: category } = await supabase
    .from("community_categories")
    .insert({
      community_id: community.id,
      name: "General",
      position: 0,
    })
    .select()
    .single();

  // Create #general channel
  if (category) {
    await supabase.from("chat_rooms").insert({
      type: "group",
      name: "general",
      created_by: user.id,
      community_id: community.id,
      category_id: category.id,
      channel_type: "discussion",
      position: 0,
    });
  }

  // Add owner as member
  await supabase.from("community_members").insert({
    community_id: community.id,
    user_id: user.id,
    role_id: role?.id || null,
  });

  return community as Community;
}

export async function updateCommunity(
  supabase: SupabaseClient,
  communityId: string,
  updates: Partial<Pick<Community, "name" | "slug" | "description" | "icon_url" | "banner_url" | "settings">>
) {
  const { data, error } = await supabase
    .from("communities")
    .update(updates)
    .eq("id", communityId)
    .select()
    .single();
  if (error) throw error;
  return data as Community;
}

export async function deleteCommunity(supabase: SupabaseClient, communityId: string) {
  const { error } = await supabase
    .from("communities")
    .delete()
    .eq("id", communityId);
  if (error) throw error;
}

/* ─── Channels ─── */

export async function getCommunityChannels(supabase: SupabaseClient, communityId: string) {
  const { data, error } = await supabase
    .from("chat_rooms")
    .select("*")
    .eq("community_id", communityId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ChatRoom[];
}

export async function createChannel(
  supabase: SupabaseClient,
  communityId: string,
  data: { name: string; category_id?: string; channel_type?: string; position?: number }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: channel, error } = await supabase
    .from("chat_rooms")
    .insert({
      type: "group",
      name: data.name,
      created_by: user.id,
      community_id: communityId,
      category_id: data.category_id || null,
      channel_type: data.channel_type || "discussion",
      position: data.position ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return channel as ChatRoom;
}

export async function updateChannel(
  supabase: SupabaseClient,
  channelId: string,
  updates: Partial<Pick<ChatRoom, "name" | "channel_type" | "position" | "category_id" | "permissions_override">>
) {
  const { data, error } = await supabase
    .from("chat_rooms")
    .update(updates)
    .eq("id", channelId)
    .select()
    .single();
  if (error) throw error;
  return data as ChatRoom;
}

export async function deleteChannel(supabase: SupabaseClient, channelId: string) {
  const { error } = await supabase
    .from("chat_rooms")
    .delete()
    .eq("id", channelId);
  if (error) throw error;
}

/* ─── Members ─── */

export async function getCommunityMembers(supabase: SupabaseClient, communityId: string) {
  const { data, error } = await supabase
    .from("community_members")
    .select(`
      *,
      user:profiles!user_id(id, username, display_name, avatar_url, is_verified, pro_subscription_status),
      role:community_roles!role_id(id, name, color, permissions, position)
    `)
    .eq("community_id", communityId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CommunityMember[];
}

export async function joinCommunity(supabase: SupabaseClient, communityId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get default role
  const { data: defaultRole } = await supabase
    .from("community_roles")
    .select("id")
    .eq("community_id", communityId)
    .eq("is_default", true)
    .single();

  const { error } = await supabase
    .from("community_members")
    .insert({
      community_id: communityId,
      user_id: user.id,
      role_id: defaultRole?.id || null,
    });
  if (error) throw error;
}

export async function leaveCommunity(supabase: SupabaseClient, communityId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("community_members")
    .delete()
    .match({ community_id: communityId, user_id: user.id });
  if (error) throw error;
}

/* ─── Categories ─── */

export async function getCommunityCategories(supabase: SupabaseClient, communityId: string) {
  const { data, error } = await supabase
    .from("community_categories")
    .select("*")
    .eq("community_id", communityId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CommunityCategory[];
}

export async function createCategory(
  supabase: SupabaseClient,
  communityId: string,
  name: string,
  position = 0
) {
  const { data, error } = await supabase
    .from("community_categories")
    .insert({ community_id: communityId, name, position })
    .select()
    .single();
  if (error) throw error;
  return data as CommunityCategory;
}

export async function updateCategory(
  supabase: SupabaseClient,
  categoryId: string,
  updates: Partial<Pick<CommunityCategory, "name" | "position">>
) {
  const { data, error } = await supabase
    .from("community_categories")
    .update(updates)
    .eq("id", categoryId)
    .select()
    .single();
  if (error) throw error;
  return data as CommunityCategory;
}

export async function deleteCategory(supabase: SupabaseClient, categoryId: string) {
  const { error } = await supabase
    .from("community_categories")
    .delete()
    .eq("id", categoryId);
  if (error) throw error;
}

/* ─── Roles ─── */

export async function getCommunityRoles(supabase: SupabaseClient, communityId: string) {
  const { data, error } = await supabase
    .from("community_roles")
    .select("*")
    .eq("community_id", communityId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CommunityRole[];
}
