"use client";

import { useState } from "react";
import { useAddReaction, useRemoveReaction } from "@propian/shared/hooks";
import { IconBookmark } from "@propian/shared/icons";
import type { Message } from "@propian/shared/types";
import { formatTime } from "@propian/shared/utils";
import { createBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { ReactionBar } from "./ReactionBar";
import { ReactionPicker } from "./ReactionPicker";
import { PinMessageDialog } from "./PinMessageDialog";

interface ChatMessageProps {
  message: Message;
  isSent: boolean;
  isGrouped: boolean;
  currentUserId?: string;
  /** Community context for pinning (only in community view) */
  communityId?: string;
  channelId?: string;
}

export function ChatMessage({
  message,
  isSent,
  isGrouped,
  currentUserId,
  communityId,
  channelId,
}: ChatMessageProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const supabase = createBrowserClient();
  const addReaction = useAddReaction(supabase);
  const removeReaction = useRemoveReaction(supabase);

  const reactions = message.reactions ?? [];
  const isPinned = message.is_pinned_to_library === true;

  function handleReactionToggle(emoji: string) {
    const existing = reactions.find(
      (r) => r.emoji === emoji && r.user_id === currentUserId
    );
    if (existing) {
      removeReaction.mutate({ messageId: message.id, emoji, userId: currentUserId });
    } else {
      addReaction.mutate({ messageId: message.id, emoji, userId: currentUserId });
    }
  }

  function handleReactionSelect(emoji: string) {
    addReaction.mutate({ messageId: message.id, emoji, userId: currentUserId });
  }

  return (
    <div className={`pt-chat-msg-row ${isGrouped ? "grouped" : ""}`}>
      {/* Avatar (always left, only for non-grouped) */}
      {!isGrouped && (
        <div className="pt-chat-msg-avatar">
          <Avatar
            src={message.author?.avatar_url}
            name={message.author?.display_name ?? "User"}
            size="chat"
          />
        </div>
      )}

      {/* Spacer for grouped messages (same width as avatar) */}
      {isGrouped && <div className="pt-chat-msg-avatar-spacer" />}

      <div className="pt-chat-msg-content">
        {/* Author line: name + time (only for non-grouped) */}
        {!isGrouped && message.author && (
          <div className="pt-chat-msg-author">
            <span className="pt-chat-msg-author-name">
              {message.author.display_name}
            </span>
            <span className="pt-chat-msg-author-time">
              {formatTime(message.created_at)}
            </span>
          </div>
        )}

        {/* Pin indicator */}
        {isPinned && (
          <div className="pt-msg-pin-badge">
            <IconBookmark size={10} />
            Pinned
          </div>
        )}

        {/* Message content — flat, no bubble */}
        {message.type === "image" ? (
          <img
            src={message.content}
            alt="Shared image"
            className="pt-chat-msg-image"
          />
        ) : (
          <div
            className="pt-chat-msg-text"
            dangerouslySetInnerHTML={{ __html: message.content }}
          />
        )}

        {/* Reactions */}
        <ReactionBar
          reactions={reactions}
          currentUserId={currentUserId}
          onToggle={handleReactionToggle}
          onOpenPicker={() => setPickerOpen(true)}
        />

        {/* Hover action bar */}
        <div className="pt-chat-msg-actions">
          {/* React */}
          <button
            className="pt-chat-msg-action-btn"
            onClick={() => setPickerOpen((v) => !v)}
            title="React"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>

          {/* Reply */}
          <button className="pt-chat-msg-action-btn" title="Reply" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
          </button>

          {/* Thread */}
          <button className="pt-chat-msg-action-btn" title="Thread" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          {/* Pin to Knowledge Library (only in community channels) */}
          {communityId && channelId && !isPinned && (
            <button
              className="pt-chat-msg-action-btn"
              onClick={() => setPinDialogOpen(true)}
              title="Pin to Knowledge Library"
              type="button"
            >
              <IconBookmark size={14} />
            </button>
          )}

          {/* More */}
          <button className="pt-chat-msg-action-btn" title="More" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        </div>

        {/* Reaction picker popover */}
        {pickerOpen && (
          <div className="pt-reaction-picker-anchor">
            <ReactionPicker
              isOpen={pickerOpen}
              onClose={() => setPickerOpen(false)}
              onSelect={handleReactionSelect}
            />
          </div>
        )}
      </div>

      {/* Pin dialog */}
      {pinDialogOpen && communityId && channelId && (
        <PinMessageDialog
          messageId={message.id}
          channelId={channelId}
          communityId={communityId}
          onClose={() => setPinDialogOpen(false)}
        />
      )}
    </div>
  );
}
