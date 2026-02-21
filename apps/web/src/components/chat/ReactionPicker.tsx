"use client";

import { useEffect, useRef } from "react";

/** Quick reaction picker — shows a row of common emojis */

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "🎯", "💯", "👀", "🚀"];

interface ReactionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export function ReactionPicker({ isOpen, onClose, onSelect }: ReactionPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={pickerRef} className="pt-reaction-picker">
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          className="pt-reaction-picker-btn"
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          type="button"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
