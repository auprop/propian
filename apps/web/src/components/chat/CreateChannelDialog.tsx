"use client";

import { useState } from "react";
import { useCreateChannel, useCommunityCategories } from "@propian/shared/hooks";
import { IconClose } from "@propian/shared/icons";
import type { CommunityCategory } from "@propian/shared/types";
import { createBrowserClient } from "@/lib/supabase/client";

const CHANNEL_TYPES = [
  { value: "discussion", label: "Discussion", icon: "#" },
  { value: "setups", label: "Setups", icon: "#" },
  { value: "signals", label: "Signals", icon: "#" },
  { value: "resources", label: "Resources", icon: "#" },
  { value: "qa", label: "Q&A", icon: "?" },
];

interface CreateChannelDialogProps {
  communityId: string;
  defaultCategoryId?: string;
  onClose: () => void;
  onCreated?: (channelId: string) => void;
}

export function CreateChannelDialog({
  communityId,
  defaultCategoryId,
  onClose,
  onCreated,
}: CreateChannelDialogProps) {
  const supabase = createBrowserClient();
  const createChannel = useCreateChannel(supabase);
  const { data: categories } = useCommunityCategories(supabase, communityId);

  const [name, setName] = useState("");
  const [channelType, setChannelType] = useState("discussion");
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? "");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setErrorMsg("");

    try {
      const result = await createChannel.mutateAsync({
        communityId,
        data: {
          name: name.trim().toLowerCase().replace(/\s+/g, "-"),
          category_id: categoryId || undefined,
          channel_type: channelType,
        },
      });

      if (result?.id) {
        onCreated?.(result.id);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      console.error("Create channel error:", err);
    }
  }

  return (
    <div className="pt-pin-overlay" onClick={onClose}>
      <div className="pt-pin-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pt-pin-dialog-header">
          <div className="pt-pin-dialog-title">Create Channel</div>
          <button
            className="pt-chat-header-btn"
            onClick={onClose}
            type="button"
          >
            <IconClose size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Channel Name */}
          <div className="pt-pin-field">
            <label className="pt-pin-label">Channel Name *</label>
            <input
              className="pt-dialog-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. general"
              maxLength={50}
              autoFocus
              required
            />
            {name && (
              <div className="pt-dialog-slug">
                # {name.trim().toLowerCase().replace(/\s+/g, "-")}
              </div>
            )}
          </div>

          {/* Channel Type */}
          <div className="pt-pin-field">
            <label className="pt-pin-label">Channel Type</label>
            <div className="pt-channel-type-grid">
              {CHANNEL_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  type="button"
                  className={`pt-channel-type-btn ${channelType === ct.value ? "active" : ""}`}
                  onClick={() => setChannelType(ct.value)}
                >
                  <span className="pt-channel-type-icon">{ct.icon}</span>
                  <span>{ct.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          {categories && categories.length > 0 && (
            <div className="pt-pin-field">
              <label className="pt-pin-label">Category</label>
              <select
                className="pt-dialog-input"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">No category</option>
                {categories.map((cat: CommunityCategory) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Error display */}
          {errorMsg && (
            <div className="pt-dialog-error">
              {errorMsg}
            </div>
          )}

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
              disabled={!name.trim() || createChannel.isPending}
            >
              {createChannel.isPending ? "Creating..." : "Create Channel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
