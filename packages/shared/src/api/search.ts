import type { SupabaseClient } from "@supabase/supabase-js";

export async function searchAll(
  supabase: SupabaseClient,
  query: string,
  filter?: "all" | "traders" | "firms" | "posts" | "reviews"
) {
  const results: { traders: any[]; firms: any[]; posts: any[]; reviews: any[] } = {
    traders: [],
    firms: [],
    posts: [],
    reviews: [],
  };

  if (!query.trim()) return results;

  const searchTerm = `%${query}%`;

  if (!filter || filter === "all" || filter === "traders") {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, is_verified, bio")
      .or(`username.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
      .limit(10);
    results.traders = data ?? [];
  }

  if (!filter || filter === "all" || filter === "firms") {
    const { data } = await supabase
      .from("firms")
      .select("*")
      .eq("is_active", true)
      .ilike("name", searchTerm)
      .limit(10);
    results.firms = data ?? [];
  }

  if (!filter || filter === "all" || filter === "posts") {
    const { data } = await supabase
      .from("posts")
      .select("*, author:profiles!user_id(id, username, display_name, avatar_url, is_verified)")
      .ilike("content", searchTerm)
      .order("created_at", { ascending: false })
      .limit(10);
    results.posts = data ?? [];
  }

  if (!filter || filter === "all" || filter === "reviews") {
    const { data } = await supabase
      .from("firm_reviews")
      .select("*, author:profiles!user_id(username, display_name, avatar_url, is_verified)")
      .or(`title.ilike.${searchTerm},body.ilike.${searchTerm}`)
      .order("created_at", { ascending: false })
      .limit(10);
    results.reviews = data ?? [];
  }

  return results;
}
