"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/feed",
    label: "Feed",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
    ),
  },
  {
    href: "/firms",
    label: "Firms",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8l-2 4h12z"/></svg>
    ),
  },
  {
    href: "/leaderboard",
    label: "Rank",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 22V8h4v14"/><path d="M6 22V12h4"/><path d="M14 22V12h4"/></svg>
    ),
  },
  {
    href: "/chat",
    label: "Chat",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
    ),
  },
  {
    href: "/settings",
    label: "More",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
    ),
  },
];

export function BottomBar() {
  const pathname = usePathname();

  return (
    <div className="pt-bottombar">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`pt-bottombar-tab ${pathname.startsWith(tab.href) ? "active" : ""}`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </Link>
      ))}
    </div>
  );
}
