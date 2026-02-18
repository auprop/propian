import type { SupabaseClient } from "@supabase/supabase-js";
import type { Firm, FirmFilter } from "../types";

export async function getFirms(supabase: SupabaseClient, filter?: FirmFilter) {
  let query = supabase.from("firms").select("*").eq("is_active", true);

  if (filter?.search) {
    query = query.ilike("name", `%${filter.search}%`);
  }
  if (filter?.minRating) {
    query = query.gte("rating_avg", filter.minRating);
  }

  switch (filter?.sort) {
    case "rating":
      query = query.order("rating_avg", { ascending: false });
      break;
    case "reviews":
      query = query.order("review_count", { ascending: false });
      break;
    case "fee":
      query = query.order("challenge_fee_min", { ascending: true });
      break;
    default:
      query = query.order("review_count", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Firm[];
}

export async function getFirmBySlug(supabase: SupabaseClient, slug: string) {
  const { data, error } = await supabase
    .from("firms")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return data as Firm;
}

export async function getFirmsBySlugs(supabase: SupabaseClient, slugs: string[]) {
  const { data, error } = await supabase
    .from("firms")
    .select("*")
    .in("slug", slugs)
    .eq("is_active", true);
  if (error) throw error;
  return data as Firm[];
}

export async function searchFirms(supabase: SupabaseClient, query: string) {
  const { data, error } = await supabase
    .from("firms")
    .select("*")
    .eq("is_active", true)
    .ilike("name", `%${query}%`)
    .limit(10);
  if (error) throw error;
  return data as Firm[];
}
