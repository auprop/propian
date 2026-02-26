import { CSSProperties } from "react";

const style: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#c8ff00",
  color: "#0a0a0a",
  fontSize: 9,
  fontWeight: 800,
  lineHeight: 1,
  padding: "2px 5px",
  borderRadius: 4,
  letterSpacing: 0.5,
  verticalAlign: "middle",
  flexShrink: 0,
};

export function IconPro({ size }: { size?: number }) {
  const s = size
    ? { ...style, fontSize: Math.max(7, size - 4), padding: `${Math.max(1, size / 7)}px ${Math.max(3, size / 3)}px` }
    : style;
  return <span style={s}>PRO</span>;
}
