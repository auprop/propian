interface BadgeProps {
  children: React.ReactNode;
  variant?: "lime" | "red" | "amber" | "green" | "blue" | "";
  className?: string;
}

export function Badge({ children, variant = "", className = "" }: BadgeProps) {
  return <span className={`pt-badge ${variant} ${className}`}>{children}</span>;
}
