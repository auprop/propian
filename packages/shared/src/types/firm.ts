export interface Firm {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  logo_text: string | null;
  logo_color: string | null;
  description: string | null;
  website: string | null;
  founded: number | null;
  profit_split: string | null;
  max_drawdown: string | null;
  daily_drawdown: string | null;
  challenge_fee_min: number | null;
  payout_cycle: string | null;
  scaling_plan: boolean;
  platforms: string[];
  rating_avg: number;
  review_count: number;
  pass_rate: string | null;
  total_payouts: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FirmReview {
  id: string;
  firm_id: string;
  user_id: string;
  rating: number;
  title: string;
  body: string;
  pros: string[];
  cons: string[];
  tags: string[];
  helpful_count: number;
  verified_purchase: boolean;
  is_anonymous: boolean;
  created_at: string;
  author?: { username: string; display_name: string; avatar_url: string | null; is_verified: boolean };
}

export interface FirmFilter {
  search?: string;
  category?: string;
  sort?: "rating" | "reviews" | "fee" | "popularity";
  minRating?: number;
}
