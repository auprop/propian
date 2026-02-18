"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div>
        {label && <label className="pt-input-label">{label}</label>}
        <input ref={ref} className={`pt-input ${error ? "error" : ""} ${className}`} {...props} />
        {error && <p style={{ color: "var(--red)", fontSize: 13, marginTop: 4 }}>{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
