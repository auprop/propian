"use client";

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
}

export function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <div className="pt-toggle" onClick={onChange}>
      <div className={`pt-toggle-track ${checked ? "on" : ""}`}>
        <div className="pt-toggle-thumb" />
      </div>
    </div>
  );
}
