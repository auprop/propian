"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { searchUsers } from "@propian/shared/api";
import { Avatar } from "./Avatar";
import { IconVerified } from "@propian/shared/icons";

interface MentionUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
}

interface MentionDropdownProps {
  supabase: SupabaseClient;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  content: string;
  onSelect: (username: string, startIndex: number, endIndex: number) => void;
}

/**
 * Extract the @mention query at the current cursor position.
 * Returns { query, startIndex, endIndex } or null if no mention is active.
 */
function getMentionQuery(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return null;

  const cursor = textarea.selectionStart ?? 0;
  const text = textarea.value;

  // Walk backward from cursor to find @
  let start = cursor - 1;
  while (start >= 0) {
    const ch = text[start];
    // Stop at whitespace or newline — no mention active
    if (/\s/.test(ch)) return null;
    // Found @
    if (ch === "@") break;
    start--;
  }

  if (start < 0 || text[start] !== "@") return null;

  // @ must be at the start of the string or preceded by whitespace
  if (start > 0 && !/\s/.test(text[start - 1])) return null;

  const query = text.slice(start + 1, cursor);
  if (query.length === 0) return null; // Need at least 1 char after @

  return { query, startIndex: start, endIndex: cursor };
}

export function MentionDropdown({
  supabase,
  textareaRef,
  content,
  onSelect,
}: MentionDropdownProps) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [debouncedQuery, setDebouncedQuery] = useState<string | null>(null);

  // Debounce the search query (200ms)
  useEffect(() => {
    if (mentionQuery === null) {
      setDebouncedQuery(null);
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(mentionQuery), 200);
    return () => clearTimeout(timer);
  }, [mentionQuery]);

  // Search users
  const { data: users = [] } = useQuery<MentionUser[]>({
    queryKey: ["mention-search", debouncedQuery],
    queryFn: () => searchUsers(supabase, debouncedQuery!, 5),
    enabled: !!debouncedQuery && debouncedQuery.length >= 1,
    staleTime: 30_000,
  });

  // Detect mention on every keystroke / cursor change
  const checkMention = useCallback(() => {
    const result = getMentionQuery(textareaRef.current);
    if (result) {
      setMentionQuery(result.query);
      setMentionRange({ start: result.startIndex, end: result.endIndex });
    } else {
      setMentionQuery(null);
      setMentionRange(null);
    }
    setActiveIndex(0);
  }, [textareaRef]);

  // Attach input + click listeners to the textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    ta.addEventListener("input", checkMention);
    ta.addEventListener("click", checkMention);
    ta.addEventListener("keyup", checkMention);

    return () => {
      ta.removeEventListener("input", checkMention);
      ta.removeEventListener("click", checkMention);
      ta.removeEventListener("keyup", checkMention);
    };
  }, [textareaRef, checkMention]);

  // Also re-check when content changes (e.g., form reset)
  useEffect(() => {
    checkMention();
  }, [content, checkMention]);

  // Handle keyboard navigation on the textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta || !mentionQuery || users.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, users.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && mentionRange) {
        e.preventDefault();
        const user = users[activeIndex];
        if (user) {
          onSelect(user.username, mentionRange.start, mentionRange.end);
          setMentionQuery(null);
          setMentionRange(null);
        }
      } else if (e.key === "Escape") {
        setMentionQuery(null);
        setMentionRange(null);
      }
    };

    ta.addEventListener("keydown", handleKeyDown);
    return () => ta.removeEventListener("keydown", handleKeyDown);
  }, [textareaRef, mentionQuery, mentionRange, users, activeIndex, onSelect]);

  // Close on outside click
  useEffect(() => {
    if (!mentionQuery) return;

    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setMentionQuery(null);
        setMentionRange(null);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mentionQuery, textareaRef]);

  // Don't render if no mention or no results
  if (!mentionQuery || !mentionRange || users.length === 0) return null;

  return (
    <div ref={dropdownRef} className="pt-mention-dropdown">
      {users.map((user, index) => (
        <div
          key={user.id}
          className={`pt-mention-item ${index === activeIndex ? "active" : ""}`}
          onMouseEnter={() => setActiveIndex(index)}
          onMouseDown={(e) => {
            e.preventDefault(); // Prevent blur on textarea
            onSelect(user.username, mentionRange.start, mentionRange.end);
            setMentionQuery(null);
            setMentionRange(null);
          }}
        >
          <Avatar src={user.avatar_url} name={user.display_name} size="sm" />
          <div className="pt-mention-item-info">
            <div className="pt-mention-item-name">
              {user.display_name}
              {user.is_verified && (
                <IconVerified size={14} />
              )}
            </div>
            <div className="pt-mention-item-username">@{user.username}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
