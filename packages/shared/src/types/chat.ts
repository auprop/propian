import { UserPreview } from "./user";

/* ─── Enums / Literals ─── */

export type RoomType = "dm" | "group";
export type ChannelType = "discussion" | "setups" | "signals" | "resources" | "qa";

/* ─── Community Settings & Permissions ─── */

export interface CommunitySettings {
  /** Allow members (not just mods) to pin messages to the knowledge library */
  allow_member_pins?: boolean;
  /** Default notification level: 'all' | 'mentions' | 'none' */
  default_notification_level?: "all" | "mentions" | "none";
  /** Whether the community is publicly listed */
  is_public?: boolean;
}

export interface CommunityPermissions {
  can_manage_channels?: boolean;
  can_manage_roles?: boolean;
  can_manage_members?: boolean;
  can_pin_messages?: boolean;
  can_delete_messages?: boolean;
  can_send_messages?: boolean;
}

/* ─── Communities ─── */

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  banner_url: string | null;
  owner_id: string | null;
  settings: CommunitySettings;
  created_at: string;
  /** Joined from queries */
  member_count?: number;
  channels?: ChatRoom[];
  categories?: CommunityCategory[];
}

export interface CommunityCategory {
  id: string;
  community_id: string;
  name: string;
  position: number;
  created_at: string;
  /** Joined */
  channels?: ChatRoom[];
}

export interface CommunityRole {
  id: string;
  community_id: string;
  name: string;
  color: string | null;
  permissions: CommunityPermissions;
  position: number;
  is_default: boolean;
  created_at: string;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role_id: string | null;
  joined_at: string;
  nickname: string | null;
  /** Joined */
  user?: UserPreview;
  role?: CommunityRole;
}

/* ─── Chat Rooms / Channels ─── */

export interface ChatRoom {
  id: string;
  type: RoomType;
  name: string | null;
  created_by: string | null;
  created_at: string;
  /** Enhanced: community channel fields */
  community_id?: string | null;
  category_id?: string | null;
  channel_type?: ChannelType | null;
  position?: number;
  permissions_override?: CommunityPermissions | null;
  /** Joined from queries */
  participants?: ChatParticipant[];
  last_message?: Message;
  unread_count?: number;
}

export interface ChatParticipant {
  room_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  user?: UserPreview;
}

/* ─── Messages ─── */

export interface StructuredTradeData {
  ticker?: string;
  direction?: "long" | "short";
  entry?: number;
  stop_loss?: number;
  take_profit?: number;
  timeframe?: string;
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  type: "text" | "image";
  created_at: string;
  /** Enhanced fields */
  ticker_mentions?: string[] | null;
  is_pinned_to_library?: boolean;
  structured_data?: StructuredTradeData | null;
  /** Joined */
  author?: UserPreview;
  reactions?: MessageReaction[];
}

/* ─── Reactions ─── */

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  /** Joined */
  user?: UserPreview;
}

/** Grouped reaction for display: emoji + count + whether current user reacted */
export interface ReactionGroup {
  emoji: string;
  count: number;
  users: UserPreview[];
  reacted: boolean;
}

/* ─── Channel Read State ─── */

export interface ChannelReadState {
  user_id: string;
  channel_id: string;
  last_read_message_id: string | null;
  last_read_at: string;
  mention_count: number;
}

/* ─── Knowledge Pins ─── */

export interface KnowledgePin {
  id: string;
  community_id: string;
  channel_id: string;
  message_id: string;
  pinned_by: string | null;
  category: string | null;
  tags: string[] | null;
  created_at: string;
  /** Joined */
  message?: Message;
  pinner?: UserPreview;
  channel?: Pick<ChatRoom, "id" | "name" | "channel_type">;
}
