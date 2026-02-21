"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { IconClose, IconSearch } from "@propian/shared/icons";
import { useChatStore } from "@/stores/chat";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import type { IndexedMessage } from "@/lib/meilisearch";

interface SearchHit extends IndexedMessage {
  _formatted?: {
    content_text?: string;
  };
}

interface ChatSearchProps {
  communityId?: string | null;
  roomId?: string | null;
}

export function ChatSearch({ communityId, roomId }: ChatSearchProps) {
  const { toggleSearch, setActiveChannel } = useChatStore();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const performSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setHits([]);
        setTotalHits(0);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      try {
        const params = new URLSearchParams({ q });
        if (communityId) params.set("community_id", communityId);
        if (roomId) params.set("room_id", roomId);
        params.set("limit", "30");

        const res = await fetch(`/api/search?${params.toString()}`);
        const data = await res.json();

        setHits(data.hits ?? []);
        setTotalHits(data.estimatedTotalHits ?? 0);
        setHasSearched(true);
      } catch {
        setHits([]);
        setTotalHits(0);
        setHasSearched(true);
      } finally {
        setIsSearching(false);
      }
    },
    [communityId, roomId]
  );

  function handleInputChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  }

  function handleJumpToMessage(hit: SearchHit) {
    if (hit.room_id) {
      setActiveChannel(hit.room_id);
    }
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="pt-search-panel">
      {/* Header */}
      <div className="pt-search-panel-header">
        <div className="pt-knowledge-header-left">
          <IconSearch size={16} />
          <span className="pt-knowledge-title">Search Messages</span>
        </div>
        <button
          className="pt-chat-header-btn"
          onClick={toggleSearch}
          title="Close"
          type="button"
        >
          <IconClose size={14} />
        </button>
      </div>

      {/* Search input */}
      <div className="pt-search-panel-input">
        <input
          ref={inputRef}
          type="text"
          className="pt-search-field"
          placeholder="Search messages..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
        />
        {totalHits > 0 && (
          <span className="pt-search-count">
            {totalHits} result{totalHits !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Results */}
      <div className="pt-search-results">
        {isSearching ? (
          <div className="pt-knowledge-loading">Searching...</div>
        ) : hasSearched && hits.length === 0 ? (
          <EmptyState
            title="No results"
            description={`No messages found for "${query}"`}
          />
        ) : !hasSearched ? (
          <div className="pt-search-hint">
            <p>Search across all messages in this community.</p>
            <p>Try searching for a topic, ticker, or user name.</p>
          </div>
        ) : (
          hits.map((hit) => (
            <button
              key={hit.id}
              className="pt-search-result"
              onClick={() => handleJumpToMessage(hit)}
              type="button"
            >
              <div className="pt-search-result-header">
                <Avatar
                  src={hit.author_avatar}
                  name={hit.author_name}
                  size="sm"
                />
                <span className="pt-search-result-author">
                  {hit.author_name}
                </span>
                {hit.channel_name && (
                  <span className="pt-search-result-channel">
                    in #{hit.channel_name}
                  </span>
                )}
                <span className="pt-search-result-date">
                  {formatDate(hit.created_at)}
                </span>
              </div>
              <div
                className="pt-search-result-text"
                dangerouslySetInnerHTML={{
                  __html: hit._formatted?.content_text ?? hit.content,
                }}
              />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
