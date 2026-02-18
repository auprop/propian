"use client";

interface FilterChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button className={`pt-filter-chip ${active ? "active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}
