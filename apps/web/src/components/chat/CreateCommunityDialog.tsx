"use client";

import { useState } from "react";
import { useCreateCommunity } from "@propian/shared/hooks";
import { IconClose } from "@propian/shared/icons";
import { createBrowserClient } from "@/lib/supabase/client";

interface CreateCommunityDialogProps {
  onClose: () => void;
  onCreated?: (id: string) => void;
}

export function CreateCommunityDialog({ onClose, onCreated }: CreateCommunityDialogProps) {
  const supabase = createBrowserClient();
  const createCommunity = useCreateCommunity(supabase);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const result = await createCommunity.mutateAsync({
        name: name.trim(),
        slug,
        description: description.trim() || undefined,
      });

      if (result?.id) {
        onCreated?.(result.id);
      }
      onClose();
    } catch {
      // Error is handled by TanStack Query's mutation state
    }
  }

  return (
    <div className="pt-pin-overlay" onClick={onClose}>
      <div className="pt-pin-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pt-pin-dialog-header">
          <div className="pt-pin-dialog-title">Create Community</div>
          <button
            className="pt-chat-header-btn"
            onClick={onClose}
            type="button"
          >
            <IconClose size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="pt-pin-field">
            <label className="pt-pin-label">Community Name *</label>
            <input
              className="pt-dialog-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Forex Masterminds"
              maxLength={50}
              autoFocus
              required
            />
            {slug && (
              <div className="pt-dialog-slug">
                propian.com/community/{slug}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="pt-pin-field">
            <label className="pt-pin-label">Description (optional)</label>
            <textarea
              className="pt-dialog-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this community about?"
              maxLength={200}
              rows={3}
            />
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
              type="submit"
              disabled={!name.trim() || createCommunity.isPending}
            >
              {createCommunity.isPending ? "Creating..." : "Create Community"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
