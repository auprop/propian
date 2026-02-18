/* ─── Referral Types ─── */

/** Referral tier names */
export type ReferralTier = "bronze" | "silver" | "gold" | "diamond";

/** Tier metadata (client-side constant) */
export interface ReferralTierMeta {
  key: ReferralTier;
  name: string;
  icon: string;
  minReferrals: number;
  rewardPct: number;
  rewards: string[];
}

/** A user's referral profile */
export interface ReferralProfile {
  id: string;
  user_id: string;
  referral_code: string;
  referred_by: string | null;
  tier: ReferralTier;
  total_referrals: number;
  total_earnings: number;
  created_at: string;
}

/** A single referral (someone who signed up via your code) */
export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: "pending" | "active" | "inactive";
  reward_amount: number;
  created_at: string;
  /** Joined */
  referred_user?: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
}

/** Leaderboard entry for referral rankings */
export interface ReferralLeaderboardEntry {
  user_id: string;
  referral_code: string;
  total_referrals: number;
  total_earnings: number;
  tier: ReferralTier;
  rank: number;
  /** Joined */
  user?: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
}

/** Referral stats summary */
export interface ReferralStats {
  total_referrals: number;
  total_earnings: number;
  current_tier: ReferralTier;
  next_tier: ReferralTier | null;
  referrals_to_next: number;
}
