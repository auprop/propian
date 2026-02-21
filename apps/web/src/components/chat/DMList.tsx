"use client";

import { useState } from "react";
import { useChatRooms, useSession } from "@propian/shared/hooks";
import { IconSearch } from "@propian/shared/icons";
import { timeAgo } from "@propian/shared/utils";
import type { ChatRoom } from "@propian/shared/types";
import { createBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useChatStore } from "@/stores/chat";

function getRoomDisplayName(room: ChatRoom, currentUserId?: string): string {
  if (room.name) return room.name;
  const other = room.participants?.find((p) => p.user_id !== currentUserId);
  return other?.user?.display_name ?? "Direct Message";
}

function getRoomAvatar(
  room: ChatRoom,
  currentUserId?: string
): { src: string | null; name: string } {
  if (room.type === "group") {
    return { src: null, name: room.name ?? "Group" };
  }
  const other = room.participants?.find((p) => p.user_id !== currentUserId);
  return {
    src: other?.user?.avatar_url ?? null,
    name: other?.user?.display_name ?? "User",
  };
}

export function DMList() {
  const supabase = createBrowserClient();
  const { data: session } = useSession(supabase);
  const currentUserId = session?.user?.id;

  const { data: rooms, isLoading } = useChatRooms(supabase);
  const { activeChannelId, setActiveChannel } = useChatStore();
  const [search, setSearch] = useState("");

  const filteredRooms = rooms?.filter((room: ChatRoom) => {
    if (!search.trim()) return true;
    return getRoomDisplayName(room, currentUserId)
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  return (
    <div className="pt-chat-channels">
      {/* Header */}
      <div className="pt-chat-channels-header">
        <span className="pt-chat-channels-title">Messages</span>
      </div>

      {/* Search */}
      <div className="pt-chat-channels-search">
        <div className="pt-search-bar" style={{ margin: 0 }}>
          <span className="pt-search-icon">
            <IconSearch size={14} />
          </span>
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="pt-chat-channels-list">
        {isLoading && (
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Skeleton width={36} height={36} borderRadius="50%" />
                <div style={{ flex: 1 }}>
                  <Skeleton width="60%" height={13} />
                  <Skeleton width="80%" height={11} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && (!filteredRooms || filteredRooms.length === 0) && (
          <div style={{ padding: 24, textAlign: "center", opacity: 0.5, fontSize: 13 }}>
            No conversations found
          </div>
        )}

        {filteredRooms?.map((room: ChatRoom) => {
          const avatar = getRoomAvatar(room, currentUserId);
          const isActive = room.id === activeChannelId;

          return (
            <div
              key={room.id}
              className={`pt-chat-item ${isActive ? "active" : ""}`}
              onClick={() => setActiveChannel(room.id)}
            >
              <Avatar src={avatar.src} name={avatar.name} size="sm" />
              <div className="pt-chat-info">
                <div className="pt-chat-name">
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {getRoomDisplayName(room, currentUserId)}
                  </span>
                  {room.last_message && (
                    <span className="pt-chat-time">
                      {timeAgo(room.last_message.created_at)}
                    </span>
                  )}
                </div>
                <div className="pt-chat-preview">
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {room.last_message?.content ?? "No messages yet"}
                  </span>
                  {(room.unread_count ?? 0) > 0 && (
                    <Badge variant="lime">{room.unread_count}</Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
