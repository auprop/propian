import { UserPreview } from "./user";

export type PostType = "text" | "image" | "poll" | "quote" | "repost";
export type SentimentTag = "bullish" | "bearish" | "neutral";

export interface Post {
  id: string;
  user_id: string;
  content: string;
  type: PostType;
  media_urls: string[];
  sentiment_tag: SentimentTag | null;
  like_count: number;
  comment_count: number;
  share_count: number;
  repost_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  author?: UserPreview;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  is_reposted?: boolean;
  quoted_post_id?: string | null;
  quoted_post?: Post | null;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  like_count: number;
  reply_count: number;
  created_at: string;
  author?: UserPreview;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  replies?: Comment[];
}

export interface Like {
  id: string;
  user_id: string;
  target_id: string;
  target_type: "post" | "comment";
  created_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface Repost {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}
