"use client";

import { useEffect, useRef } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ isOpen, onClose, onSelect }: EmojiPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    // Small delay to prevent the opening click from immediately closing
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
    <div ref={pickerRef} className="pt-emoji-picker-popover">
      <Picker
        data={data}
        onEmojiSelect={(emoji: { native: string }) => onSelect(emoji.native)}
        theme="light"
        previewPosition="none"
        skinTonePosition="none"
        maxFrequentRows={2}
        perLine={8}
      />
    </div>
  );
}
