"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import dynamic from "next/dynamic";
import { useSendMessage, useCommunityMembers } from "@propian/shared/hooks";
import type { UserPreview } from "@propian/shared/types";
import { createBrowserClient } from "@/lib/supabase/client";
import { useChatStore } from "@/stores/chat";
import { uploadFile } from "@/lib/upload";
import { TiptapEditor } from "./TiptapEditor";
import type { TiptapEditorRef } from "./TiptapEditor";
import { FilePreview } from "./FilePreview";
import type { PendingFile } from "./FilePreview";

// Lazy-load emoji picker (2MB+ bundle)
const EmojiPicker = dynamic(
  () => import("./EmojiPicker").then((m) => ({ default: m.EmojiPicker })),
  { ssr: false, loading: () => null }
);

/* ─── Inline SVG Icons ─── */

const IcPlus = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IcGif = ({ s = 16 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M7 8v8M12 8v8M17 8v4h-2M7 12h2" />
  </svg>
);

const IcImage = ({ s = 16 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);

const IcSmile = ({ s = 16 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

const IcSend = ({ s = 15 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

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

      setCharCount(editorRef.current?.getCharCount() ?? 0);
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
          f.id === pf.id ? { ...f, status: "done" as const, uploadedUrl: result.url } : f
        )
      );
    } catch (err) {
      setPendingFiles((prev) =>
        prev.map((f) =>
          f.id === pf.id ? { ...f, status: "error" as const, error: String(err) } : f
        )
      );
    }
  }

  function addFiles(files: File[]) {
    const newFiles: PendingFile[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      status: "uploading" as const,
    }));
    setPendingFiles((prev) => [...prev, ...newFiles]);
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
    const doneFiles = pendingFiles.filter((f) => f.status === "done" && f.uploadedUrl);
    const uploading = pendingFiles.some((f) => f.status === "uploading");

    if (!hasText && doneFiles.length === 0) return;
    if (uploading) return;

    if (hasText) {
      await sendMessage.mutateAsync({ roomId, content: html, type: "text" });
    }

    for (const pf of doneFiles) {
      if (pf.uploadedUrl) {
        await sendMessage.mutateAsync({ roomId, content: pf.uploadedUrl, type: "image" });
      }
    }

    editorRef.current?.clear();
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
  }

  /* ─── Computed ─── */

  const editorEmpty = charCount === 0;
  const hasDoneFiles = pendingFiles.some((f) => f.status === "done");
  const isUploading = pendingFiles.some((f) => f.status === "uploading");
  const canSend = (!editorEmpty || hasDoneFiles) && !isUploading;

  return (
    <div {...getRootProps()} className="pc-input-wrapper">
      {isDragActive && (
        <div className="pc-dropzone-overlay">Drop files here</div>
      )}

      {/* File preview strip */}
      <FilePreview files={pendingFiles} onRemove={handleRemoveFile} />

      <div className="pc-input-area">
        <div className="pc-input-wrap">
          {/* Plus / Attach */}
          <button className="pc-ibtn" onClick={open} title="Attach file" type="button">
            <IcPlus s={18} />
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

          {/* GIF button */}
          <button className="pc-ibtn" title="GIF" type="button">
            <IcGif s={16} />
          </button>

          {/* Image button */}
          <button className="pc-ibtn" onClick={open} title="Upload image" type="button">
            <IcImage s={16} />
          </button>

          {/* Emoji */}
          <div style={{ position: "relative" }}>
            <button
              className="pc-ibtn"
              onClick={() => setEmojiPickerOpen((v) => !v)}
              title="Emoji"
              type="button"
            >
              <IcSmile s={16} />
            </button>
            <EmojiPicker
              isOpen={emojiPickerOpen}
              onClose={() => setEmojiPickerOpen(false)}
              onSelect={handleEmojiSelect}
            />
          </div>

          {/* Send */}
          <button
            className={`pc-send ${canSend ? "" : "disabled"}`}
            onClick={handleSend}
            disabled={!canSend || sendMessage.isPending}
            title="Send message"
            type="button"
          >
            <IcSend s={15} />
          </button>
        </div>
      </div>

      <input {...getInputProps()} />
    </div>
  );
}
