import type { SupabaseClient } from "@supabase/supabase-js";
import type { FirmReview } from "../types";

export async function getReviews(
  supabase: SupabaseClient,
  firmId: string,
  sort: "recent" | "helpful" = "recent"
) {
  let query = supabase
    .from("firm_reviews")
    .select("*, author:profiles!user_id(username, display_name, avatar_url, is_verified, pro_subscription_status)")
    .eq("firm_id", firmId);

  if (sort === "helpful") {
    query = query.order("helpful_count", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as FirmReview[];
}

export async function createReview(
  supabase: SupabaseClient,
  firmId: string,
  review: {
    rating: number;
    title: string;
    body: string;
    pros: string[];
    cons: string[];
    tags: string[];
    is_anonymous: boolean;
  }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("firm_reviews")
    .insert({ ...review, firm_id: firmId, user_id: user.id })
    .select("*, author:profiles!user_id(username, display_name, avatar_url, is_verified, pro_subscription_status)")
    .single();
  if (error) throw error;
  return data as FirmReview;
}

export async function voteReview(supabase: SupabaseClient, reviewId: string) {
  const { error } = await supabase.rpc("increment_helpful_count", { review_id: reviewId });
  if (error) throw error;
}
