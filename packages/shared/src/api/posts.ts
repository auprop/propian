import type { SupabaseClient } from "@supabase/supabase-js";
import type { Post, PaginatedResponse } from "../types";

const PAGE_SIZE = 20;

const AUTHOR_SELECT = "*, author:profiles!user_id(id, username, display_name, avatar_url, is_verified, pro_subscription_status)";

/* ------------------------------------------------------------------ */
/*  Shared helper: enrich posts with quoted posts + interaction flags  */
/* ------------------------------------------------------------------ */

async function enrichPosts(supabase: SupabaseClient, posts: any[]): Promise<void> {
  if (posts.length === 0) return;

  // 1. Fetch quoted posts
  const quotedIds = [
    ...new Set(
      posts
        .map((p: any) => p.quoted_post_id)
        .filter((id: any): id is string => !!id)
    ),
  ];

  if (quotedIds.length > 0) {
    const { data: quotedPosts } = await supabase
      .from("posts")
      .select(AUTHOR_SELECT)
      .in("id", quotedIds);

    if (quotedPosts) {
      const quotedMap = new Map(quotedPosts.map((qp: any) => [qp.id, qp]));
      for (const post of posts) {
        if (post.quoted_post_id) {
          post.quoted_post = quotedMap.get(post.quoted_post_id) ?? null;
        }
      }
    }
  }

  // 2. Populate is_liked, is_bookmarked, is_reposted for the current user
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
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
      post.is_liked = likedIds.has(post.id);
      post.is_bookmarked = bookmarkedIds.has(post.id);
      post.is_reposted = repostedIds.has(post.id);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Shared helper: paginate + enrich                                   */
/* ------------------------------------------------------------------ */

function paginateResults(data: any[] | null, pageSize: number): { posts: any[]; hasMore: boolean } {
  const hasMore = (data?.length ?? 0) > pageSize;
  const posts = hasMore ? data!.slice(0, pageSize) : (data ?? []);
  return { posts, hasMore };
}

/* ------------------------------------------------------------------ */
/*  Feed (uses single-query RPC — 1 round trip instead of 4-5)         */
/* ------------------------------------------------------------------ */

async function fetchFeed(
  supabase: SupabaseClient,
  mode: "for-you" | "following",
  cursor?: string
): Promise<PaginatedResponse<Post>> {
  const { data, error } = await supabase.rpc("get_feed", {
    p_mode: mode,
    p_cursor: cursor ?? null,
    p_limit: PAGE_SIZE,
  });
  if (error) throw error;

  const posts = (data ?? []) as Post[];
  const hasMore = posts.length > PAGE_SIZE;
  const result = hasMore ? posts.slice(0, PAGE_SIZE) : posts;

  return {
    data: result,
    nextCursor: hasMore ? result[result.length - 1].created_at : null,
    hasMore,
  };
}

export function getFeedPosts(
  supabase: SupabaseClient,
  cursor?: string
): Promise<PaginatedResponse<Post>> {
  return fetchFeed(supabase, "for-you", cursor);
}

export function getFollowingFeedPosts(
  supabase: SupabaseClient,
  cursor?: string
): Promise<PaginatedResponse<Post>> {
  return fetchFeed(supabase, "following", cursor);
}

/* ------------------------------------------------------------------ */
/*  User posts (profile page)                                          */
/* ------------------------------------------------------------------ */

export async function getUserPosts(
  supabase: SupabaseClient,
  userId: string,
  cursor?: string
): Promise<PaginatedResponse<Post>> {
  let query = supabase
    .from("posts")
    .select(AUTHOR_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const { posts, hasMore } = paginateResults(data, PAGE_SIZE);
  await enrichPosts(supabase, posts);

  return {
    data: posts as Post[],
    nextCursor: hasMore ? posts[posts.length - 1].created_at : null,
    hasMore,
  };
}

export async function getPostById(
  supabase: SupabaseClient,
  postId: string
): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .select("*, author:profiles!user_id(id, username, display_name, avatar_url, is_verified, pro_subscription_status)")
    .eq("id", postId)
    .single();
  if (error) return null;

  const post = data as any;

  // Fetch quoted post separately if needed
  if (post.quoted_post_id) {
    const { data: quotedPost } = await supabase
      .from("posts")
      .select("*, author:profiles!user_id(id, username, display_name, avatar_url, is_verified, pro_subscription_status)")
      .eq("id", post.quoted_post_id)
      .single();
    post.quoted_post = quotedPost ?? null;
  }

  // Populate user interaction flags
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const [likedRes, bookmarkedRes, repostedRes] = await Promise.all([
      supabase.from("likes").select("id").eq("user_id", user.id).eq("target_id", postId).eq("target_type", "post").maybeSingle(),
      supabase.from("bookmarks").select("id").eq("user_id", user.id).eq("post_id", postId).maybeSingle(),
      supabase.from("reposts").select("id").eq("user_id", user.id).eq("post_id", postId).maybeSingle(),
    ]);
    post.is_liked = !!likedRes.data;
    post.is_bookmarked = !!bookmarkedRes.data;
    post.is_reposted = !!repostedRes.data;
  }

  return post as Post;
}

export async function createPost(
  supabase: SupabaseClient,
  post: { content: string; type?: string; sentiment_tag?: string | null; media_urls?: string[]; quoted_post_id?: string | null }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("posts")
    .insert({ ...post, user_id: user.id })
    .select("*, author:profiles!user_id(id, username, display_name, avatar_url, is_verified, pro_subscription_status)")
    .single();
  if (error) throw error;
  return data as Post;
}

export async function deletePost(supabase: SupabaseClient, postId: string) {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}

export async function updatePost(
  supabase: SupabaseClient,
  postId: string,
  updates: { content: string; sentiment_tag?: string | null }
) {
  const { data, error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", postId)
    .select("*, author:profiles!user_id(id, username, display_name, avatar_url, is_verified, pro_subscription_status)")
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
    .select("*, author:profiles!user_id(id, username, display_name, avatar_url, is_verified, pro_subscription_status)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const comments = data ?? [];
  if (comments.length === 0) return comments;

  // Populate is_liked and is_bookmarked for current user
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const commentIds = comments.map((c: any) => c.id);
    const [likedRes, bookmarkedRes] = await Promise.all([
      supabase.from("likes").select("target_id").eq("user_id", user.id).eq("target_type", "comment").in("target_id", commentIds),
      supabase.from("comment_bookmarks").select("comment_id").eq("user_id", user.id).in("comment_id", commentIds),
    ]);
    const likedIds = new Set((likedRes.data ?? []).map((r: any) => r.target_id));
    const bookmarkedIds = new Set((bookmarkedRes.data ?? []).map((r: any) => r.comment_id));

    for (const comment of comments) {
      (comment as any).is_liked = likedIds.has((comment as any).id);
      (comment as any).is_bookmarked = bookmarkedIds.has((comment as any).id);
    }
  }

  // Organize into threads: top-level comments get replies array
  const commentMap = new Map<string, any>();
  const topLevel: any[] = [];

  for (const comment of comments) {
    (comment as any).replies = [];
    commentMap.set((comment as any).id, comment);
  }

  for (const comment of comments) {
    const c = comment as any;
    if (c.parent_id && commentMap.has(c.parent_id)) {
      commentMap.get(c.parent_id).replies.push(c);
    } else {
      topLevel.push(c);
    }
  }

  return topLevel;
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
    .select("*, author:profiles!user_id(id, username, display_name, avatar_url, is_verified, pro_subscription_status)")
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

  // Insert into reposts table (for tracking)
  const { error: repostError } = await supabase
    .from("reposts")
    .insert({ user_id: user.id, post_id: postId });
  if (repostError) throw repostError;

  // Also create a post entry so it appears in the feed
  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      content: "",
      type: "repost",
      quoted_post_id: postId,
    })
    .select("*, author:profiles!user_id(id, username, display_name, avatar_url, is_verified, pro_subscription_status)")
    .single();
  if (error) throw error;
  return data as Post;
}

export async function unrepostPost(supabase: SupabaseClient, postId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Remove from reposts table
  const { error: repostError } = await supabase
    .from("reposts")
    .delete()
    .match({ user_id: user.id, post_id: postId });
  if (repostError) throw repostError;

  // Also delete the repost post entry from the feed
  const { error } = await supabase
    .from("posts")
    .delete()
    .match({ user_id: user.id, type: "repost", quoted_post_id: postId });
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/*  Comment interactions                                               */
/* ------------------------------------------------------------------ */

export async function likeComment(supabase: SupabaseClient, commentId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("likes")
    .insert({ user_id: user.id, target_id: commentId, target_type: "comment" });
  if (error) throw error;
}

export async function unlikeComment(supabase: SupabaseClient, commentId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("likes")
    .delete()
    .match({ user_id: user.id, target_id: commentId, target_type: "comment" });
  if (error) throw error;
}

export async function bookmarkComment(supabase: SupabaseClient, commentId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("comment_bookmarks")
    .insert({ user_id: user.id, comment_id: commentId });
  if (error) throw error;
}

export async function unbookmarkComment(supabase: SupabaseClient, commentId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("comment_bookmarks")
    .delete()
    .match({ user_id: user.id, comment_id: commentId });
  if (error) throw error;
}

export async function incrementShareCount(supabase: SupabaseClient, postId: string) {
  const { error } = await supabase.rpc("increment_share_count", { post_id: postId });
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/*  Post image upload                                                  */
/* ------------------------------------------------------------------ */

export async function uploadPostImage(
  supabase: SupabaseClient,
  file: { uri?: string; base64?: string; blob?: Blob; type?: string },
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const ext = file.type?.includes("png")
    ? "png"
    : file.type?.includes("webp")
      ? "webp"
      : "jpg";
  const filePath = `${user.id}/${Date.now()}.${ext}`;

  let uploadBody: Blob | ArrayBuffer;

  if (file.blob) {
    // Web: already a Blob / File
    uploadBody = file.blob;
  } else if (file.base64) {
    // Mobile: convert base64 to ArrayBuffer
    const binaryString = atob(file.base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    uploadBody = bytes.buffer;
  } else {
    throw new Error("No file data provided");
  }

  const { error: uploadError } = await supabase.storage
    .from("post-images")
    .upload(filePath, uploadBody, {
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from("post-images")
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}
