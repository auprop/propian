import { UserPreview } from "./user";

export type RoomType = "dm" | "group";

export interface ChatRoom {
  id: string;
  type: RoomType;
  name: string | null;
  created_by: string | null;
  created_at: string;
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

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  type: "text" | "image";
  created_at: string;
  author?: UserPreview;
}
