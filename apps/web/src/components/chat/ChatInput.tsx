"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import dynamic from "next/dynamic";
import { useSendMessage, useCommunityMembers } from "@propian/shared/hooks";
import { IconSend, IconPlus } from "@propian/shared/icons";
import type { UserPreview } from "@propian/shared/types";
import { createBrowserClient } from "@/lib/supabase/client";
import { useChatStore } from "@/stores/chat";
import { uploadFile } from "@/lib/upload";
import { TiptapEditor } from "./TiptapEditor";
import type { TiptapEditorRef } from "./TiptapEditor";
import { FilePreview } from "./FilePreview";
import type { PendingFile } from "./FilePreview";

// Lazy-load emoji picker (2MB+ bundle)
const EmojiPicker = dynamic(() => import("./EmojiPicker").then((m) => ({ default: m.EmojiPicker })), {
  ssr: false,
  loading: () => null,
});

/* ─── Types ─── */

interface ChatInputProps {
  roomId: string;
  communityId?: string;
  onTyping?: () => void;
  onStopTyping?: () => void;
}

/* ─── Draft parser ─── */

function parseInitialContent(draft: string): unknown | undefined {
  if (!draft) return undefined;
  try {
    const json = JSON.parse(draft);
    if (json && json.type === "doc" && Array.isArray(json.content)) {
      return json;
    }
    // Legacy plain text
    return {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: draft }] }],
    };
  } catch {
    return {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: draft }] }],
    };
  }
}

/* ─── Component ─── */

export function ChatInput({ roomId, communityId, onTyping, onStopTyping }: ChatInputProps) {
  const supabase = createBrowserClient();
  const sendMessage = useSendMessage(supabase);
  const { getDraft, setDraft, clearDraft } = useChatStore();

  // Mention suggestions
  const { data: members } = useCommunityMembers(supabase, communityId ?? "");
  const mentionUsers: UserPreview[] =
    members
      ?.map((m) => m.user)
      .filter((u): u is UserPreview => !!u) ?? [];

  // State
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const editorRef = useRef<TiptapEditorRef>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Initial content from draft
  const initialContent = parseInitialContent(getDraft(roomId));

  // Draft persistence (debounced)
  const handleEditorUpdate = useCallback(
    (json: unknown) => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      draftTimerRef.current = setTimeout(() => {
        const str = JSON.stringify(json);
        setDraft(roomId, str);
      }, 300);

      // Update char count
      setCharCount(editorRef.current?.getCharCount() ?? 0);

      // Broadcast typing
      onTyping?.();
    },
    [roomId, setDraft, onTyping]
  );

  // Cleanup draft timer
  useEffect(() => {
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, []);

  /* ─── File Upload ─── */

  async function uploadPendingFile(pf: PendingFile) {
    try {
      const result = await uploadFile(pf.file, { roomId });
      setPendingFiles((prev) =>
        prev.map((f) =>
          f.id === pf.id
            ? { ...f, status: "done" as const, uploadedUrl: result.url }
            : f
        )
      );
    } catch (err) {
      setPendingFiles((prev) =>
        prev.map((f) =>
          f.id === pf.id
            ? { ...f, status: "error" as const, error: String(err) }
            : f
        )
      );
    }
  }

  function addFiles(files: File[]) {
    const newFiles: PendingFile[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : "",
      status: "uploading" as const,
    }));

    setPendingFiles((prev) => [...prev, ...newFiles]);

    // Start uploads immediately
    newFiles.forEach(uploadPendingFile);
  }

  function handleRemoveFile(id: string) {
    setPendingFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }

  // Dropzone
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (accepted) => addFiles(accepted),
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
      "application/pdf": [".pdf"],
    },
    maxSize: 10 * 1024 * 1024,
    noClick: true,
    noKeyboard: true,
  });

  /* ─── Send ─── */

  async function handleSend() {
    const html = editorRef.current?.getHTML() ?? "";
    const text = editorRef.current?.getText() ?? "";
    const hasText = text.trim().length > 0;
    const doneFiles = pendingFiles.filter(
      (f) => f.status === "done" && f.uploadedUrl
    );
    const uploading = pendingFiles.some((f) => f.status === "uploading");

    if (!hasText && doneFiles.length === 0) return;
    if (uploading) return; // Wait for uploads

    // Send text message
    if (hasText) {
      await sendMessage.mutateAsync({ roomId, content: html, type: "text" });
    }

    // Send each uploaded file as image message
    for (const pf of doneFiles) {
      if (pf.uploadedUrl) {
        await sendMessage.mutateAsync({
          roomId,
          content: pf.uploadedUrl,
          type: "image",
        });
      }
    }

    // Clear
    editorRef.current?.clear();
    // Revoke all object URLs
    pendingFiles.forEach((pf) => {
      if (pf.previewUrl) URL.revokeObjectURL(pf.previewUrl);
    });
    setPendingFiles([]);
    clearDraft(roomId);
    setCharCount(0);
    onStopTyping?.();
  }

  /* ─── Emoji ─── */

  function handleEmojiSelect(emoji: string) {
    editorRef.current?.insertEmoji(emoji);
    // Keep picker open for multiple selections
  }

  /* ─── Computed ─── */

  const editorEmpty = charCount === 0;
  const hasDoneFiles = pendingFiles.some((f) => f.status === "done");
  const isUploading = pendingFiles.some((f) => f.status === "uploading");
  const canSend = (!editorEmpty || hasDoneFiles) && !isUploading;

  return (
    <div {...getRootProps()} className="pt-chat-input-wrapper">
      {isDragActive && (
        <div className="pt-chat-dropzone-overlay">Drop files here</div>
      )}

      {/* File preview strip */}
      <FilePreview files={pendingFiles} onRemove={handleRemoveFile} />

      <div className="pt-chat-input">
        {/* Attachment button */}
        <button
          className="pt-chat-input-btn"
          onClick={open}
          title="Attach file"
          type="button"
        >
          <IconPlus size={18} />
        </button>

        {/* Tiptap editor */}
        <TiptapEditor
          ref={editorRef}
          roomId={roomId}
          onSend={handleSend}
          onUpdate={handleEditorUpdate}
          initialContent={initialContent}
          mentionSuggestions={mentionUsers}
        />

        {/* Emoji */}
        <div style={{ position: "relative" }}>
          <button
            className="pt-chat-input-btn"
            onClick={() => setEmojiPickerOpen((v) => !v)}
            title="Emoji"
            type="button"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>
          <EmojiPicker
            isOpen={emojiPickerOpen}
            onClose={() => setEmojiPickerOpen(false)}
            onSelect={handleEmojiSelect}
          />
        </div>

        {/* Character count */}
        {charCount > 3500 && (
          <span
            className={`pt-chat-char-count ${charCount > 3800 ? "warning" : ""}`}
          >
            {charCount} / 4000
          </span>
        )}

        {/* Send */}
        <button
          className={`pt-chat-send-btn ${canSend ? "active" : ""}`}
          onClick={handleSend}
          disabled={!canSend || sendMessage.isPending}
          title="Send message"
          type="button"
        >
          <IconSend size={16} />
        </button>
      </div>

      <input {...getInputProps()} />
    </div>
  );
}
