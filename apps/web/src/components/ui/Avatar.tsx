"use client";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl" | "chat";
  showStatus?: boolean;
  isOnline?: boolean;
}

const sizeMap = { sm: 32, md: 40, lg: 56, xl: 80, chat: 38 };
const sizeClass = { sm: "sm", md: "md", lg: "lg", xl: "xl", chat: "chat" };

export function Avatar({ src, name, size = "md", showStatus, isOnline }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`pt-av ${sizeClass[size]}${src ? " has-img" : ""}`}>
      {src ? (
        <img src={src} alt={name} className="pt-av-img" />
      ) : (
        <span className="pt-av-initials">{initials}</span>
      )}
      {showStatus && <div className={`pt-av-dot ${isOnline ? "online" : ""}`} />}
    </div>
  );
}
