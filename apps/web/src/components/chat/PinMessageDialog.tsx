"use client";

import { useState } from "react";
import { usePinMessage } from "@propian/shared/hooks";
import { IconClose, IconBookmark } from "@propian/shared/icons";
import { createBrowserClient } from "@/lib/supabase/client";

const PIN_CATEGORIES = [
  { value: "setup", label: "Setup" },
  { value: "signal", label: "Signal" },
  { value: "resource", label: "Resource" },
  { value: "insight", label: "Insight" },
  { value: "rule", label: "Rule" },
];

interface PinMessageDialogProps {
  messageId: string;
  channelId: string;
  communityId: string;
  onClose: () => void;
}

export function PinMessageDialog({
  messageId,
  channelId,
  communityId,
  onClose,
}: PinMessageDialogProps) {
  const supabase = createBrowserClient();
  const pinMessage = usePinMessage(supabase);
  const [category, setCategory] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  function handleAddTag() {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  }

  function handleRemoveTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  }

  async function handleSubmit() {
    await pinMessage.mutateAsync({
      communityId,
      channelId,
      messageId,
      category: category || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
    onClose();
  }

  return (
    <div className="pt-pin-overlay" onClick={onClose}>
      <div className="pt-pin-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pt-pin-dialog-header">
          <div className="pt-pin-dialog-title">
            <IconBookmark size={16} />
            Pin to Knowledge Library
          </div>
          <button
            className="pt-chat-header-btn"
            onClick={onClose}
            type="button"
          >
            <IconClose size={14} />
          </button>
        </div>

        {/* Category */}
        <div className="pt-pin-field">
          <label className="pt-pin-label">Category</label>
          <div className="pt-pin-categories">
            {PIN_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                className={`pt-pin-cat-btn ${category === cat.value ? "active" : ""}`}
                onClick={() =>
                  setCategory(category === cat.value ? "" : cat.value)
                }
                type="button"
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="pt-pin-field">
          <label className="pt-pin-label">Tags (optional, max 5)</label>
          <div className="pt-pin-tag-input-row">
            <input
              className="pt-pin-tag-input"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add tag..."
              maxLength={30}
            />
            <button
              className="pt-pin-tag-add"
              onClick={handleAddTag}
              disabled={!tagInput.trim() || tags.length >= 5}
              type="button"
            >
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="pt-pin-tags">
              {tags.map((tag) => (
                <span key={tag} className="pt-knowledge-tag">
                  {tag}
                  <button
                    className="pt-pin-tag-remove"
                    onClick={() => handleRemoveTag(tag)}
                    type="button"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-pin-dialog-actions">
          <button
            className="pt-pin-cancel-btn"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="pt-pin-submit-btn"
            onClick={handleSubmit}
            disabled={pinMessage.isPending}
            type="button"
          >
            {pinMessage.isPending ? "Pinning..." : "Pin Message"}
          </button>
        </div>
      </div>
    </div>
  );
}
