"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import type { UserPreview } from "@propian/shared/types";
import { Avatar } from "@/components/ui/Avatar";

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface MentionListProps {
  items: UserPreview[];
  command: (attrs: { id: string; label: string }) => void;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) =>
            prev <= 0 ? items.length - 1 : prev - 1
          );
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) =>
            prev >= items.length - 1 ? 0 : prev + 1
          );
          return true;
        }
        if (event.key === "Enter") {
          const item = items[selectedIndex];
          if (item) {
            command({ id: item.id, label: item.display_name });
          }
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) return null;

    return (
      <div className="pt-mention-list">
        {items.map((item, index) => (
          <button
            key={item.id}
            className={`pt-mention-item ${index === selectedIndex ? "selected" : ""}`}
            onClick={() =>
              command({ id: item.id, label: item.display_name })
            }
            type="button"
          >
            <Avatar src={item.avatar_url} name={item.display_name} size="sm" />
            <span className="pt-mention-item-name">{item.display_name}</span>
            <span className="pt-mention-item-username">@{item.username}</span>
          </button>
        ))}
      </div>
    );
  }
);

MentionList.displayName = "MentionList";
