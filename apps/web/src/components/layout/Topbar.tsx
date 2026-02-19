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
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="m13.5 4.18c-.276 0-.5-.224-.5-.5v-1.68c0-.551-.449-1-1-1s-1 .449-1 1v1.68c0 .276-.224.5-.5.5s-.5-.223-.5-.5v-1.68c0-1.103.897-2 2-2s2 .897 2 2v1.68c0 .277-.224.5-.5.5z" />
            <path d="m12 24c-1.93 0-3.5-1.57-3.5-3.5 0-.276.224-.5.5-.5s.5.224.5.5c0 1.378 1.122 2.5 2.5 2.5s2.5-1.122 2.5-2.5c0-.276.224-.5.5-.5s.5.224.5.5c0 1.93-1.57 3.5-3.5 3.5z" />
            <path d="m20.5 21h-17c-.827 0-1.5-.673-1.5-1.5 0-.439.191-.854.525-1.14 1.576-1.332 2.475-3.27 2.475-5.322v-3.038c0-3.86 3.14-7 7-7 3.86 0 7 3.14 7 7v3.038c0 2.053.899 3.99 2.467 5.315.342.293.533.708.533 1.147 0 .827-.672 1.5-1.5 1.5zm-8.5-17c-3.309 0-6 2.691-6 6v3.038c0 2.348-1.028 4.563-2.821 6.079-.115.098-.179.237-.179.383 0 .276.224.5.5.5h17c.276 0 .5-.224.5-.5 0-.146-.064-.285-.175-.38-1.796-1.519-2.825-3.735-2.825-6.082v-3.038c0-3.309-2.691-6-6-6z" />
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
