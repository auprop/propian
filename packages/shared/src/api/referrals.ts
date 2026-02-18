import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ReferralProfile,
  Referral,
  ReferralLeaderboardEntry,
  ReferralTier,
} from "../types";

/* ─── Tier thresholds ─── */

const TIER_THRESHOLDS: { tier: ReferralTier; min: number }[] = [
  { tier: "diamond", min: 100 },
  { tier: "gold", min: 50 },
  { tier: "silver", min: 10 },
  { tier: "bronze", min: 0 },
];

function computeTier(referrals: number): ReferralTier {
  for (const t of TIER_THRESHOLDS) {
    if (referrals >= t.min) return t.tier;
  }
  return "bronze";
}

/* ─── Read ─── */

/** Get the current user's referral profile */
export async function getReferralProfile(
  supabase: SupabaseClient,
): Promise<ReferralProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("referral_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as ReferralProfile | null;
}

/** Get the current user's referrals (people they referred) */
export async function getUserReferrals(
  supabase: SupabaseClient,
): Promise<Referral[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("referrals")
    .select(
      "*, referred_user:profiles!referrals_referred_id_fkey(display_name, username, avatar_url)",
    )
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Referral[];
}

/** Get referral leaderboard (top referrers) */
export async function getReferralLeaderboard(
  supabase: SupabaseClient,
  limit = 20,
): Promise<ReferralLeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("referral_profiles")
    .select(
      "user_id, referral_code, total_referrals, total_earnings, tier, user:profiles!referral_profiles_user_id_fkey(display_name, username, avatar_url)",
    )
    .gt("total_referrals", 0)
    .order("total_referrals", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((d, i) => ({
    ...(d as any),
    rank: i + 1,
  })) as ReferralLeaderboardEntry[];
}

/** Look up a referral code to get the referrer */
export async function lookupReferralCode(
  supabase: SupabaseClient,
  code: string,
): Promise<ReferralProfile | null> {
  const { data, error } = await supabase
    .from("referral_profiles")
    .select("*")
    .eq("referral_code", code.toUpperCase())
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as ReferralProfile | null;
}

/* ─── Write ─── */

/** Apply a referral code (used during signup or later) */
export async function applyReferralCode(
  supabase: SupabaseClient,
  code: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Find referrer by code
  const referrer = await lookupReferralCode(supabase, code);
  if (!referrer) throw new Error("Invalid referral code");
  if (referrer.user_id === user.id)
    throw new Error("Cannot use your own referral code");

  // Update current user's referred_by
  const { error: updateError } = await supabase
    .from("referral_profiles")
    .update({ referred_by: referrer.user_id })
    .eq("user_id", user.id);

  if (updateError) throw new Error(updateError.message);

  // Create referral record — 7 days Pro = $10 credit value
  const rewardAmount = 10;
  const { error: refError } = await supabase.from("referrals").insert({
    referrer_id: referrer.user_id,
    referred_id: user.id,
    status: "active",
    reward_amount: rewardAmount,
  });

  if (refError) throw new Error(refError.message);
}
