"use client";

import { useState } from "react";
import { useKnowledgePins, useUnpinMessage } from "@propian/shared/hooks";
import { IconClose, IconBookmark } from "@propian/shared/icons";
import type { KnowledgePin } from "@propian/shared/types";
import { formatTime } from "@propian/shared/utils";
import { createBrowserClient } from "@/lib/supabase/client";
import { useChatStore } from "@/stores/chat";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "setup", label: "Setups" },
  { value: "signal", label: "Signals" },
  { value: "resource", label: "Resources" },
  { value: "insight", label: "Insights" },
  { value: "rule", label: "Rules" },
];

interface KnowledgeLibraryProps {
  communityId: string;
}

export function KnowledgeLibrary({ communityId }: KnowledgeLibraryProps) {
  const supabase = createBrowserClient();
  const [activeCategory, setActiveCategory] = useState("");
  const { toggleKnowledgeLibrary, setActiveChannel } = useChatStore();

  const { data: pins, isLoading } = useKnowledgePins(
    supabase,
    communityId,
    activeCategory || undefined
  );
  const unpinMessage = useUnpinMessage(supabase);

  function handleJumpToMessage(pin: KnowledgePin) {
    if (pin.channel_id) {
      setActiveChannel(pin.channel_id);
      // Scroll to message would require more infrastructure
      // For now, just navigate to the channel
    }
  }

  function handleUnpin(pinId: string) {
    if (confirm("Remove this pin from the knowledge library?")) {
      unpinMessage.mutate(pinId);
    }
  }

  return (
    <div className="pt-knowledge-panel">
      {/* Header */}
      <div className="pt-knowledge-header">
        <div className="pt-knowledge-header-left">
          <IconBookmark size={16} />
          <span className="pt-knowledge-title">Knowledge Library</span>
        </div>
        <button
          className="pt-chat-header-btn"
          onClick={toggleKnowledgeLibrary}
          title="Close"
          type="button"
        >
          <IconClose size={14} />
        </button>
      </div>

      {/* Category tabs */}
      <div className="pt-knowledge-tabs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            className={`pt-knowledge-tab ${activeCategory === cat.value ? "active" : ""}`}
            onClick={() => setActiveCategory(cat.value)}
            type="button"
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Pins list */}
      <div className="pt-knowledge-list">
        {isLoading ? (
          <div className="pt-knowledge-loading">Loading...</div>
        ) : !pins || pins.length === 0 ? (
          <EmptyState
            title="No pins yet"
            description="Pin important messages to build your community's knowledge base."
          />
        ) : (
          pins.map((pin) => (
            <div key={pin.id} className="pt-knowledge-card">
              {/* Channel badge */}
              {pin.channel && (
                <div className="pt-knowledge-channel">
                  # {pin.channel.name}
                </div>
              )}

              {/* Message content */}
              <div className="pt-knowledge-content">
                {pin.message?.author && (
                  <div className="pt-knowledge-author">
                    <Avatar
                      src={pin.message.author.avatar_url}
                      name={pin.message.author.display_name}
                      size="sm"
                    />
                    <span>{pin.message.author.display_name}</span>
                  </div>
                )}
                {pin.message?.type === "image" ? (
                  <img
                    src={pin.message.content}
                    alt="Pinned image"
                    className="pt-knowledge-image"
                  />
                ) : (
                  <div
                    className="pt-knowledge-text"
                    dangerouslySetInnerHTML={{
                      __html: pin.message?.content ?? "",
                    }}
                  />
                )}
              </div>

              {/* Tags */}
              {pin.tags && pin.tags.length > 0 && (
                <div className="pt-knowledge-tags">
                  {pin.tags.map((tag) => (
                    <span key={tag} className="pt-knowledge-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="pt-knowledge-footer">
                <span className="pt-knowledge-meta">
                  {pin.category && (
                    <span className="pt-knowledge-cat-badge">{pin.category}</span>
                  )}
                  {pin.message?.created_at && formatTime(pin.message.created_at)}
                </span>
                <div className="pt-knowledge-actions">
                  <button
                    className="pt-knowledge-action-btn"
                    onClick={() => handleJumpToMessage(pin)}
                    title="Go to message"
                    type="button"
                  >
                    Jump
                  </button>
                  <button
                    className="pt-knowledge-action-btn danger"
                    onClick={() => handleUnpin(pin.id)}
                    title="Unpin"
                    type="button"
                  >
                    Unpin
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
