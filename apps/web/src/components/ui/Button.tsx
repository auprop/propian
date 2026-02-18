"use client";

import React from "react";

/* Default arrow icon — the signature Propian button element */
function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "lime" | "ghost" | "danger" | "text-btn" | "";
  size?: "sm" | "";
  icon?: React.ReactNode;
  /** Set to true to hide the icon pill (e.g. for text-only buttons) */
  noIcon?: boolean;
  /** Set to true for icon-only buttons (no text) */
  iconOnly?: boolean;
}

export function Button({
  children,
  variant = "",
  size = "",
  icon,
  noIcon = false,
  iconOnly = false,
  className = "",
  ...props
}: ButtonProps) {
  // text-btn variant never shows the icon pill
  const hideIcon = noIcon || variant === "text-btn";

  // Determine icon content: use provided icon or default arrow
  const iconContent = icon ?? <ArrowIcon />;

  const classes = [
    "pt-btn",
    variant,
    size,
    iconOnly ? "icon-only" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...props}>
      {!iconOnly && <span>{children}</span>}
      {!hideIcon && <span className="pt-btn-icon">{iconOnly ? (icon ?? <ArrowIcon />) : iconContent}</span>}
    </button>
  );
}
