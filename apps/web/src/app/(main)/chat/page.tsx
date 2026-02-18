"use client";

import { useState, useEffect, useRef } from "react";
import { useChatRooms, useChatMessages, useSendMessage, useSession } from "@propian/shared/hooks";
import type { ChatRoom, Message } from "@propian/shared/types";
import { timeAgo, formatTime } from "@propian/shared/utils";
import { IconSearch, IconSend } from "@propian/shared/icons";
import { createBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ChatPage() {
  const supabase = createBrowserClient();
  const { data: session } = useSession(supabase);
  const currentUserId = session?.user?.id;

  const [activeRoomId, setActiveRoomId] = useState<string>("");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: rooms, isLoading: roomsLoading } = useChatRooms(supabase);
  const { data: messages, isLoading: messagesLoading } = useChatMessages(supabase, activeRoomId);
  const sendMessage = useSendMessage(supabase);

  // Auto-select first room
  useEffect(() => {
    if (!activeRoomId && rooms && rooms.length > 0) {
      setActiveRoomId(rooms[0].id);
    }
  }, [rooms, activeRoomId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredRooms = rooms?.filter((room: ChatRoom) => {
    if (!sidebarSearch.trim()) return true;
    const search = sidebarSearch.toLowerCase();
    const roomName = getRoomDisplayName(room).toLowerCase();
    return roomName.includes(search);
  });

  const activeRoom = rooms?.find((r: ChatRoom) => r.id === activeRoomId);

  function getRoomDisplayName(room: ChatRoom): string {
    if (room.name) return room.name;
    // For DMs, show the other participant's name
    const other = room.participants?.find((p) => p.user_id !== currentUserId);
    return other?.user?.display_name ?? "Direct Message";
  }

  function getRoomAvatar(room: ChatRoom): { src: string | null; name: string } {
    if (room.type === "group") {
      return { src: null, name: room.name ?? "Group" };
    }
    const other = room.participants?.find((p) => p.user_id !== currentUserId);
    return {
      src: other?.user?.avatar_url ?? null,
      name: other?.user?.display_name ?? "User",
    };
  }

  async function handleSend() {
    const text = messageText.trim();
    if (!text || !activeRoomId) return;
    setMessageText("");
    await sendMessage.mutateAsync({ roomId: activeRoomId, content: text, type: "text" });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="pt-chat-layout">
      {/* Sidebar */}
      <div className="pt-chat-sidebar">
        {/* Sidebar Header */}
        <div style={{ padding: "16px 12px 8px", fontWeight: 700, fontSize: 18 }}>
          Messages
        </div>

        {/* Sidebar Search */}
        <div style={{ padding: "0 12px 8px" }}>
          <div className="pt-search-bar" style={{ margin: 0 }}>
            <span className="pt-search-icon">
              <IconSearch size={16} />
            </span>
            <input
              type="text"
              placeholder="Search conversations..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {roomsLoading && (
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Skeleton width={40} height={40} borderRadius="50%" />
                  <div style={{ flex: 1 }}>
                    <Skeleton width="60%" height={14} />
                    <Skeleton width="80%" height={12} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!roomsLoading && (!filteredRooms || filteredRooms.length === 0) && (
            <div style={{ padding: 24, textAlign: "center", opacity: 0.5, fontSize: 13 }}>
              No conversations found
            </div>
          )}

          {filteredRooms?.map((room: ChatRoom) => {
            const avatar = getRoomAvatar(room);
            const isActive = room.id === activeRoomId;

            return (
              <div
                key={room.id}
                className={`pt-chat-item ${isActive ? "active" : ""}`}
                onClick={() => setActiveRoomId(room.id)}
              >
                <Avatar
                  src={avatar.src}
                  name={avatar.name}
                  size="md"
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {getRoomDisplayName(room)}
                    </span>
                    {room.last_message && (
                      <span style={{ fontSize: 11, opacity: 0.4, flexShrink: 0 }}>
                        {timeAgo(room.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        opacity: 0.5,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
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

      {/* Main Chat Area */}
      <div className="pt-chat-main">
        {!activeRoomId ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <EmptyState
              title="Select a conversation"
              description="Choose a chat from the sidebar to start messaging."
            />
          </div>
        ) : (
          <>
            {/* Chat Header */}
            {activeRoom && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: "var(--brd-l)",
                }}
              >
                <Avatar
                  src={getRoomAvatar(activeRoom).src}
                  name={getRoomAvatar(activeRoom).name}
                  size="md"
                  showStatus
                  isOnline
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {getRoomDisplayName(activeRoom)}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.5 }}>
                    {activeRoom.type === "group"
                      ? `${activeRoom.participants?.length ?? 0} members`
                      : "Online"}
                  </div>
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div className="pt-chat-msgs">
              {messagesLoading && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: i % 2 === 0 ? "flex-start" : "flex-end",
                      }}
                    >
                      <Skeleton
                        width={i % 2 === 0 ? "60%" : "50%"}
                        height={40}
                        borderRadius={16}
                      />
                    </div>
                  ))}
                </div>
              )}

              {!messagesLoading && messages?.map((msg: Message) => {
                const isSent = msg.user_id === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`pt-msg ${isSent ? "sent" : "received"}`}
                  >
                    {!isSent && msg.author && (
                      <div style={{ marginBottom: 4 }}>
                        <Avatar
                          src={msg.author.avatar_url}
                          name={msg.author.display_name}
                          size="sm"
                        />
                      </div>
                    )}
                    <div className="pt-msg-bubble">
                      {!isSent && msg.author && (
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            opacity: 0.6,
                            marginBottom: 2,
                          }}
                        >
                          {msg.author.display_name}
                        </div>
                      )}
                      <div style={{ fontSize: 14, lineHeight: 1.5 }}>{msg.content}</div>
                      <div
                        style={{
                          fontSize: 10,
                          opacity: 0.4,
                          marginTop: 4,
                          textAlign: isSent ? "right" : "left",
                        }}
                      >
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing Indicator */}
              {sendMessage.isPending && (
                <div className="pt-typing">
                  <div className="pt-typing-dot" />
                  <div className="pt-typing-dot" />
                  <div className="pt-typing-dot" />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="pt-chat-input">
              <input
                type="text"
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                onClick={handleSend}
                disabled={!messageText.trim() || sendMessage.isPending}
                style={{
                  background: messageText.trim() ? "var(--lime)" : "var(--g200)",
                  color: messageText.trim() ? "var(--black)" : "var(--g400)",
                  border: "none",
                  borderRadius: "50%",
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: messageText.trim() ? "pointer" : "default",
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
              >
                <IconSend size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
