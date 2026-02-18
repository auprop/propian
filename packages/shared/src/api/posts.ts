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

  // Populate is_liked, is_bookmarked, is_reposted for the current user
  const { data: { user } } = await supabase.auth.getUser();
  if (user && posts.length > 0) {
    const postIds = posts.map((p: any) => p.id);
    const [likedRes, bookmarkedRes, repostedRes] = await Promise.all([
      supabase.from("likes").select("target_id").eq("user_id", user.id).eq("target_type", "post").in("target_id", postIds),
      supabase.from("bookmarks").select("post_id").eq("user_id", user.id).in("post_id", postIds),
      supabase.from("reposts").select("post_id").eq("user_id", user.id).in("post_id", postIds),
    ]);
    const likedIds = new Set((likedRes.data ?? []).map((r: any) => r.target_id));
    const bookmarkedIds = new Set((bookmarkedRes.data ?? []).map((r: any) => r.post_id));
    const repostedIds = new Set((repostedRes.data ?? []).map((r: any) => r.post_id));

    for (const post of posts) {
      (post as any).is_liked = likedIds.has((post as any).id);
      (post as any).is_bookmarked = bookmarkedIds.has((post as any).id);
      (post as any).is_reposted = repostedIds.has((post as any).id);
    }
  }

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

export async function repostPost(supabase: SupabaseClient, postId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("reposts")
    .insert({ user_id: user.id, post_id: postId });
  if (error) throw error;
}

export async function unrepostPost(supabase: SupabaseClient, postId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("reposts")
    .delete()
    .match({ user_id: user.id, post_id: postId });
  if (error) throw error;
}

export async function incrementShareCount(supabase: SupabaseClient, postId: string) {
  const { error } = await supabase.rpc("increment_share_count", { post_id: postId });
  if (error) throw error;
}
