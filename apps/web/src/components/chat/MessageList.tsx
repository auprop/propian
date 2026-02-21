"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { Message } from "@propian/shared/types";
import { formatDate } from "@propian/shared/utils";
import { ChatMessage } from "./ChatMessage";
import { Skeleton } from "@/components/ui/Skeleton";

interface MessageListProps {
  messages?: Message[];
  currentUserId?: string;
  isLoading: boolean;
  communityId?: string;
  channelId?: string;
}

/** Check if two messages are in the same "group" (same author, within 5 min) */
function isSameGroup(prev: Message, curr: Message): boolean {
  if (prev.user_id !== curr.user_id) return false;
  const diff =
    new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
  return diff < 5 * 60_000; // 5 minutes
}

/** Check if date changed between two messages */
function isDifferentDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() !== db.getFullYear() ||
    da.getMonth() !== db.getMonth() ||
    da.getDate() !== db.getDate()
  );
}

export function MessageList({ messages, currentUserId, isLoading, communityId, channelId }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const prevLengthRef = useRef(0);

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 80;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsAtBottom(atBottom);
    if (atBottom) setHasNewMessages(false);
  }, []);

  // Auto-scroll on new messages (if already at bottom)
  useEffect(() => {
    if (!messages) return;
    const newLength = messages.length;
    if (newLength > prevLengthRef.current) {
      if (isAtBottom) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      } else {
        setHasNewMessages(true);
      }
    }
    prevLengthRef.current = newLength;
  }, [messages, isAtBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    if (messages && messages.length > 0 && prevLengthRef.current === 0) {
      bottomRef.current?.scrollIntoView();
      prevLengthRef.current = messages.length;
    }
  }, [messages]);

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setHasNewMessages(false);
  }

  // Loading skeleton — flat layout (all left-aligned)
  if (isLoading) {
    return (
      <div className="pt-chat-msgs" style={{ padding: "16px 0" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 12,
              padding: "6px 20px",
              alignItems: "flex-start",
            }}
          >
            <Skeleton width={38} height={38} borderRadius={999} />
            <div style={{ flex: 1 }}>
              <Skeleton width={i % 2 === 0 ? "30%" : "25%"} height={14} borderRadius={4} />
              <div style={{ marginTop: 6 }}>
                <Skeleton width={i % 2 === 0 ? "70%" : "50%"} height={16} borderRadius={4} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="pt-chat-msgs" ref={containerRef} onScroll={handleScroll}>
      {messages?.map((msg, idx) => {
        const isSent = msg.user_id === currentUserId;
        const prev = idx > 0 ? messages[idx - 1] : null;
        const isGrouped = prev ? isSameGroup(prev, msg) : false;
        const showDateSep = prev
          ? isDifferentDay(prev.created_at, msg.created_at)
          : idx === 0;

        return (
          <div key={msg.id}>
            {showDateSep && (
              <div className="pt-chat-date-sep">
                <span>{formatDate(msg.created_at, "MMMM d, yyyy")}</span>
              </div>
            )}
            <ChatMessage
              message={msg}
              isSent={isSent}
              isGrouped={isGrouped && !showDateSep}
              currentUserId={currentUserId}
              communityId={communityId}
              channelId={channelId}
            />
          </div>
        );
      })}

      {/* "New messages" pill */}
      {hasNewMessages && (
        <button className="pt-chat-new-msg-pill" onClick={scrollToBottom}>
          New messages ↓
        </button>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
