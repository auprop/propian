import type { SupabaseClient } from "@supabase/supabase-js";
import type { Post, PaginatedResponse } from "../types";

const PAGE_SIZE = 20;

export async function getFeedPosts(
  supabase: SupabaseClient,
  cursor?: string
): Promise<PaginatedResponse<Post>> {
  let query = supabase
    .from("posts")
    .select("*, author:profiles!user_id(id, username, display_name, avatar_url, is_verified)")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const hasMore = (data?.length ?? 0) > PAGE_SIZE;
  const posts = hasMore ? data!.slice(0, PAGE_SIZE) : (data ?? []);

  return {
    data: posts as Post[],
    nextCursor: hasMore ? posts[posts.length - 1].created_at : null,
    hasMore,
  };
}

export async function createPost(
  supabase: SupabaseClient,
  post: { content: string; type?: string; sentiment_tag?: string | null; media_urls?: string[] }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("posts")
    .insert({ ...post, user_id: user.id })
    .select("*, author:profiles!user_id(id, username, display_name, avatar_url, is_verified)")
    .single();
  if (error) throw error;
  return data as Post;
}

export async function likePost(supabase: SupabaseClient, postId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("likes")
    .insert({ user_id: user.id, target_id: postId, target_type: "post" });
  if (error) throw error;
}

export async function unlikePost(supabase: SupabaseClient, postId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("likes")
    .delete()
    .match({ user_id: user.id, target_id: postId, target_type: "post" });
  if (error) throw error;
}

export async function getComments(supabase: SupabaseClient, postId: string) {
  const { data, error } = await supabase
    .from("comments")
    .select("*, author:profiles!user_id(id, username, display_name, avatar_url, is_verified)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createComment(
  supabase: SupabaseClient,
  postId: string,
  content: string,
  parentId?: string | null
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, user_id: user.id, content, parent_id: parentId ?? null })
    .select("*, author:profiles!user_id(id, username, display_name, avatar_url, is_verified)")
    .single();
  if (error) throw error;
  return data;
}

export async function bookmarkPost(supabase: SupabaseClient, postId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("bookmarks")
    .insert({ user_id: user.id, post_id: postId });
  if (error) throw error;
}

export async function unbookmarkPost(supabase: SupabaseClient, postId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .match({ user_id: user.id, post_id: postId });
  if (error) throw error;
}
