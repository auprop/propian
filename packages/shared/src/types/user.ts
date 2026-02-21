export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  trading_style: "scalper" | "day-trader" | "swing" | "position" | null;
  experience_level: "beginner" | "intermediate" | "advanced" | null;
  is_verified: boolean;
  is_admin: boolean;
  follower_count: number;
  following_count: number;
  post_count: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPreview {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
}

export interface Badge {
  name: string;
  description: string;
  icon: string;
  color: string;
}

export type FollowStatus = "following" | "not_following" | "self";

export interface UserPreferences {
  user_id: string;

  // Notification prefs
  email_mentions: boolean;
  email_follows: boolean;
  email_reviews: boolean;
  email_marketing: boolean;
  push_mentions: boolean;
  push_likes: boolean;
  push_follows: boolean;
  push_comments: boolean;
  push_reviews: boolean;
  inapp_all: boolean;

  // Privacy prefs
  profile_visible: boolean;
  activity_status: boolean;
  search_visible: boolean;
  show_trading_stats: boolean;

  updated_at: string;
}
