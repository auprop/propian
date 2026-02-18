"use client";

import React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div>
        {label && <label className="pt-input-label">{label}</label>}
        <textarea ref={ref} className={`pt-textarea ${error ? "error" : ""} ${className}`} {...props} />
        {error && <p style={{ color: "var(--red)", fontSize: 13, marginTop: 4 }}>{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
