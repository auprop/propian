"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus confirm button on mount, handle Escape
  useEffect(() => {
    confirmRef.current?.focus();

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <div className="pc-confirm-overlay" onClick={onCancel}>
      <div className="pc-confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="pc-confirm-title">{title}</div>
        <div className="pc-confirm-message">{message}</div>
        <div className="pc-confirm-actions">
          <button
            className="pc-confirm-cancel"
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            className={`pc-confirm-btn ${variant === "danger" ? "pc-confirm-btn-danger" : ""}`}
            onClick={onConfirm}
            disabled={isPending}
            type="button"
          >
            {isPending ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
