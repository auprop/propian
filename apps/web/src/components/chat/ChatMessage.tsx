"use client";

import { useState } from "react";
import { useAddReaction, useRemoveReaction, useUnpinByMessageId } from "@propian/shared/hooks";
import type { Message } from "@propian/shared/types";
import { formatTime } from "@propian/shared/utils";
import { createBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { ReactionBar } from "./ReactionBar";
import { ReactionPicker } from "./ReactionPicker";
import { PinMessageDialog } from "./PinMessageDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconVerified } from "@propian/shared/icons";

/* ─── Inline SVG Icons ─── */

const IcSmile = ({ s = 14 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

const IcReply = ({ s = 14 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9,17 4,12 9,7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </svg>
);

const IcThread = ({ s = 14 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7h5l2 3h8" /><path d="M3 11h5l2 3h8" /><path d="M3 15h5l2 3h8" />
  </svg>
);

const IcPin = ({ s = 14 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" />
  </svg>
);

const IcPinOff = ({ s = 14 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" />
    <line x1="3" y1="3" x2="21" y2="21" />
  </svg>
);

const IcMore = ({ s = 14 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
  </svg>
);

const IcTrendUp = ({ s = 24 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" /><polyline points="16,7 22,7 22,13" />
  </svg>
);

/* ─── Badge Helper ─── */

function getUserBadge(author: Message["author"]): string | null {
  // In a real implementation, you'd check the user's role
  // For now we'll return null and let the CSS handle it
  return null;
}

/* ─── Types ─── */

interface ChatMessageProps {
  message: Message;
  isSent: boolean;
  isGrouped: boolean;
  currentUserId?: string;
  communityId?: string;
  channelId?: string;
  canPin?: boolean;
  onOpenThread?: (msg: Message) => void;
  onOpenProfile?: (userId: string) => void;
}

/* ─── Component ─── */

export function ChatMessage({
  message,
  isSent,
  isGrouped,
  currentUserId,
  communityId,
  channelId,
  canPin,
  onOpenThread,
  onOpenProfile,
}: ChatMessageProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [unpinConfirmOpen, setUnpinConfirmOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const supabase = createBrowserClient();
  const addReaction = useAddReaction(supabase);
  const removeReaction = useRemoveReaction(supabase);
  const unpinByMessageId = useUnpinByMessageId(supabase);

  const reactions = message.reactions ?? [];
  const isPinned = message.is_pinned_to_library === true;

  function handleUnpin() {
    unpinByMessageId.mutate(message.id, {
      onSuccess: () => setUnpinConfirmOpen(false),
    });
  }

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
    <div
      className={`pc-msg${isPinned ? " pc-msg-pinned" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      {!isGrouped ? (
        <div
          style={{ cursor: "pointer" }}
          onClick={() => message.user_id && onOpenProfile?.(message.user_id)}
        >
          <Avatar
            src={message.author?.avatar_url}
            name={message.author?.display_name ?? "User"}
            size="chat"
          />
        </div>
      ) : (
        <div style={{ width: 38, flexShrink: 0 }} />
      )}

      <div className="pc-msg-body">
        {/* Pinned indicator — shown above author for visibility */}
        {isPinned && !isGrouped && (
          <div className="pc-pinned-tag">
            <IcPin s={11} /> Pinned to Knowledge Library
          </div>
        )}

        {/* Author line */}
        {!isGrouped && message.author && (
          <div className="pc-msg-head">
            <span
              className="pc-msg-user"
              onClick={() => message.user_id && onOpenProfile?.(message.user_id)}
            >
              {message.author.display_name}
            </span>
            {message.author.is_verified && (
              <IconVerified size={14} />
            )}
            <span className="pc-mono-xs" style={{ color: "var(--g400)" }}>
              {formatTime(message.created_at)}
            </span>
          </div>
        )}

        {/* Message content */}
        {message.type === "image" ? (
          <div className="pc-msg-img">
            <img
              src={message.content}
              alt="Shared image"
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }}
            />
          </div>
        ) : (
          <div
            className="pc-msg-text"
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

        {/* Thread link (shown when message has replies) */}
        {(message.reply_count ?? 0) > 0 && (
          <div
            className="pc-thread-link"
            onClick={() => onOpenThread?.(message)}
          >
            <IcThread s={14} />
            <span>
              {message.reply_count} {message.reply_count === 1 ? "reply" : "replies"}
            </span>
            {message.last_reply_at && (
              <span style={{ color: "var(--g400)", fontWeight: 400, marginLeft: 4 }}>
                Last reply {formatTime(message.last_reply_at)}
              </span>
            )}
          </div>
        )}

        {/* Hover action bar */}
        {hovered && (
          <div className="pc-msg-actions">
            <div className="pc-msg-act" onClick={() => setPickerOpen((v) => !v)} title="React">
              <IcSmile s={14} />
            </div>
            <div className="pc-msg-act" onClick={() => onOpenThread?.(message)} title="Reply">
              <IcReply s={14} />
            </div>
            <div className="pc-msg-act" onClick={() => onOpenThread?.(message)} title="Thread">
              <IcThread s={14} />
            </div>
            {communityId && channelId && canPin && (
              isPinned ? (
                <div
                  className="pc-msg-act pc-msg-act-danger"
                  onClick={() => setUnpinConfirmOpen(true)}
                  title="Unpin from Knowledge Library"
                >
                  <IcPinOff s={14} />
                </div>
              ) : (
                <div className="pc-msg-act" onClick={() => setPinDialogOpen(true)} title="Pin to Knowledge Library">
                  <IcPin s={14} />
                </div>
              )
            )}
            <div className="pc-msg-act" title="More">
              <IcMore s={14} />
            </div>
          </div>
        )}

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

      {/* Unpin confirmation */}
      {unpinConfirmOpen && (
        <ConfirmDialog
          title="Unpin message"
          message="This will remove the message from the Knowledge Library. Other members will no longer see it as pinned."
          confirmLabel="Unpin"
          variant="danger"
          isPending={unpinByMessageId.isPending}
          onConfirm={handleUnpin}
          onCancel={() => setUnpinConfirmOpen(false)}
        />
      )}
    </div>
  );
}
