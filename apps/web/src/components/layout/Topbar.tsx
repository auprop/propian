"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { createBrowserClient } from "@/lib/supabase/client";
import { useSession } from "@propian/shared/hooks";
import { useCurrentProfile } from "@propian/shared/hooks";
import { useNotifications } from "@propian/shared/hooks";

interface TopbarProps {
  onToggleSidebar?: () => void;
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserClient();
  const { data: session } = useSession(supabase);
  const { data: profile } = useCurrentProfile(supabase, session?.user?.id);
  const { unreadCount } = useNotifications(supabase);

  return (
    <div className="pt-app-topbar">
      {/* Left: Hamburger (mobile) + Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          className="pt-topbar-hamburger"
          onClick={onToggleSidebar}
          aria-label="Toggle menu"
        >
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <Link href="/feed" className="pt-app-topbar-logo">
          <Image
            src="/propian-logo.svg"
            alt="Propian"
            width={120}
            height={36}
            priority
          />
        </Link>
      </div>

      {/* Center: Search bar */}
      <Link href="/search" className="pt-app-topbar-search">
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <span>Search...</span>
        <kbd>⌘K</kbd>
      </Link>

      {/* Right: Notifications + Avatar */}
      <div className="pt-app-topbar-right">
        <Link href="/notifications" className="pt-topbar-icon-btn" style={{ position: "relative" }}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="pt-topbar-badge">{unreadCount}</span>
          )}
        </Link>

        <Link href={profile ? `/@${profile.username}` : "/settings"} className="pt-topbar-avatar">
          <Avatar
            src={profile?.avatar_url}
            name={profile?.display_name || "User"}
            size="sm"
          />
        </Link>
      </div>
    </div>
  );
}
