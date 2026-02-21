"use client";

import { useMemo } from "react";
import type { MessageReaction, ReactionGroup } from "@propian/shared/types";

interface ReactionBarProps {
  reactions: MessageReaction[];
  currentUserId?: string;
  onToggle: (emoji: string) => void;
  onOpenPicker: () => void;
}

/** Group raw reactions into emoji → { count, users, reacted } */
function groupReactions(
  reactions: MessageReaction[],
  currentUserId?: string
): ReactionGroup[] {
  const map = new Map<string, ReactionGroup>();

  for (const r of reactions) {
    const existing = map.get(r.emoji);
    if (existing) {
      existing.count++;
      if (r.user) existing.users.push(r.user);
      if (r.user_id === currentUserId) existing.reacted = true;
    } else {
      map.set(r.emoji, {
        emoji: r.emoji,
        count: 1,
        users: r.user ? [r.user] : [],
        reacted: r.user_id === currentUserId,
      });
    }
  }

  return Array.from(map.values());
}

export function ReactionBar({
  reactions,
  currentUserId,
  onToggle,
  onOpenPicker,
}: ReactionBarProps) {
  const groups = useMemo(
    () => groupReactions(reactions, currentUserId),
    [reactions, currentUserId]
  );

  if (groups.length === 0) return null;

  return (
    <div className="pt-reaction-bar">
      {groups.map((group) => (
        <button
          key={group.emoji}
          className={`pt-reaction-pill ${group.reacted ? "reacted" : ""}`}
          onClick={() => onToggle(group.emoji)}
          title={group.users.map((u) => u.display_name).join(", ")}
          type="button"
        >
          <span className="pt-reaction-emoji">{group.emoji}</span>
          <span className="pt-reaction-count">{group.count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <button
        className="pt-reaction-add"
        onClick={onOpenPicker}
        title="Add reaction"
        type="button"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      </button>
    </div>
  );
}
