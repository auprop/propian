"use client";

import { useState, useEffect } from "react";
import {
  useCommunityChannels,
  useCommunityCategories,
  useSession,
  useCurrentProfile,
} from "@propian/shared/hooks";
import type { ChatRoom, CommunityCategory, Community } from "@propian/shared/types";
import { createBrowserClient } from "@/lib/supabase/client";
import { useChatStore } from "@/stores/chat";
import { Avatar } from "@/components/ui/Avatar";
import { CreateChannelDialog } from "./CreateChannelDialog";

/* ─── Inline SVG Icons (matching reference) ─── */

const IcHash = ({ s = 15 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

const IcLock = ({ s = 13 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IcDown = ({ s = 10 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="6,9 12,15 18,9" />
  </svg>
);

const IcBell = ({ s = 16 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const IcSettings = ({ s = 15 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2m0 18v2m-9-11h2m18 0h2m-3.3-6.7-1.4 1.4M6.7 17.3l-1.4 1.4m0-13.4 1.4 1.4m10.6 10.6 1.4 1.4" />
  </svg>
);

const IcPlus = ({ s = 14 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

/* ─── Types ─── */

interface ChannelListProps {
  communities?: Community[];
}

/* ─── Component ─── */

export function ChannelList({ communities }: ChannelListProps) {
  const supabase = createBrowserClient();
  const { data: session } = useSession(supabase);
  const { data: profile } = useCurrentProfile(supabase, session?.user?.id);
  const { activeCommunityId, activeChannelId, setActiveChannel, unreadCounts } =
    useChatStore();
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | undefined>();

  const activeCommunity = communities?.find((c) => c.id === activeCommunityId);
  const isAdmin = profile?.is_admin === true;
  const isOwner = activeCommunity?.owner_id === session?.user?.id;
  const canManageChannels = isAdmin || isOwner;

  function handleCreateChannel(categoryId?: string) {
    setDefaultCategoryId(categoryId);
    setShowCreateChannel(true);
  }

  function handleChannelCreated(channelId: string) {
    setActiveChannel(channelId);
  }

  return (
    <div className="pc-channels">
      {/* Header */}
      <div className="pc-ch-header">
        <span className="pc-ch-title">
          {activeCommunity?.name ?? "Traders Lounge"}
        </span>
        <button className="pc-ibtn" title="Notifications" type="button">
          <IcBell s={16} />
        </button>
      </div>

      {/* Channel List */}
      <div className="pc-ch-list">
        {activeCommunityId && (
          <ChannelCategories
            communityId={activeCommunityId}
            activeChannelId={activeChannelId}
            onSelectChannel={setActiveChannel}
            canManageChannels={canManageChannels}
            onCreateChannel={handleCreateChannel}
            unreadCounts={unreadCounts}
          />
        )}
      </div>

      {/* User Bar */}
      {profile && (
        <div className="pc-userbar">
          <Avatar
            src={profile.avatar_url}
            name={profile.display_name ?? "User"}
            size="sm"
            showStatus
            isOnline
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {profile.display_name ?? profile.username}
            </div>
            <div className="pc-mono-xs" style={{ color: "var(--g400)" }}>Online</div>
          </div>
          <button className="pc-ibtn" title="Settings" type="button">
            <IcSettings s={15} />
          </button>
        </div>
      )}

      {/* Create Channel Dialog */}
      {showCreateChannel && activeCommunityId && (
        <CreateChannelDialog
          communityId={activeCommunityId}
          defaultCategoryId={defaultCategoryId}
          onClose={() => setShowCreateChannel(false)}
          onCreated={handleChannelCreated}
        />
      )}
    </div>
  );
}

/* ─── Sub-component: Category + Channels ─── */

function ChannelCategories({
  communityId,
  activeChannelId,
  onSelectChannel,
  canManageChannels,
  onCreateChannel,
  unreadCounts,
}: {
  communityId: string;
  activeChannelId: string | null;
  onSelectChannel: (id: string | null) => void;
  canManageChannels: boolean;
  onCreateChannel: (categoryId?: string) => void;
  unreadCounts: Record<string, { count: number; mentions: number }>;
}) {
  const supabase = createBrowserClient();
  const { data: channels } = useCommunityChannels(supabase, communityId);
  const { data: categories } = useCommunityCategories(supabase, communityId);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Auto-select first channel when channels load and no channel is active
  useEffect(() => {
    if (channels && channels.length > 0 && !activeChannelId) {
      onSelectChannel(channels[0].id);
    }
  }, [channels, activeChannelId, onSelectChannel]);

  // Group channels by category_id
  const grouped = new Map<string | null, ChatRoom[]>();
  channels?.forEach((ch: ChatRoom) => {
    const key = ch.category_id ?? null;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(ch);
  });

  // Sort categories by position
  const sortedCategories = [...(categories ?? [])].sort(
    (a, b) => a.position - b.position
  );

  // Uncategorized channels first
  const uncategorized = grouped.get(null) ?? [];

  function toggleCategory(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <>
      {/* Uncategorized channels */}
      {uncategorized.map((ch) => (
        <ChannelItem
          key={ch.id}
          channel={ch}
          isActive={ch.id === activeChannelId}
          onClick={() => onSelectChannel(ch.id)}
          unreadCount={unreadCounts[ch.id]?.count ?? 0}
        />
      ))}

      {/* Categorized channels */}
      {sortedCategories.map((cat: CommunityCategory) => {
        const catChannels = (grouped.get(cat.id) ?? []).sort(
          (a, b) => (a.position ?? 0) - (b.position ?? 0)
        );
        const isCollapsed = collapsed[cat.id];

        return (
          <div key={cat.id}>
            <div className="pc-group" onClick={() => toggleCategory(cat.id)}>
              <span
                style={{
                  transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                  transition: "transform 0.15s ease",
                  display: "inline-flex",
                }}
              >
                <IcDown s={10} />
              </span>
              <span>{cat.name}</span>
              {canManageChannels && (
                <span
                  className="pc-group-add"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateChannel(cat.id);
                  }}
                  title="Add channel"
                >
                  <IcPlus s={10} />
                </span>
              )}
            </div>

            {!isCollapsed &&
              catChannels.map((ch) => (
                <ChannelItem
                  key={ch.id}
                  channel={ch}
                  isActive={ch.id === activeChannelId}
                  onClick={() => onSelectChannel(ch.id)}
                  unreadCount={unreadCounts[ch.id]?.count ?? 0}
                />
              ))}
          </div>
        );
      })}
    </>
  );
}

/* ─── Channel Item ─── */

function ChannelItem({
  channel,
  isActive,
  onClick,
  unreadCount,
}: {
  channel: ChatRoom;
  isActive: boolean;
  onClick: () => void;
  unreadCount: number;
}) {
  const hasUnread = unreadCount > 0;
  const isLocked = channel.permissions_override !== null && channel.permissions_override !== undefined;

  return (
    <div
      className={`pc-ch ${isActive ? "active" : ""} ${hasUnread ? "unread" : ""}`}
      onClick={onClick}
    >
      {isLocked ? <IcLock s={13} /> : <IcHash s={15} />}
      <span>{channel.name ?? "untitled"}</span>
      {hasUnread && !isActive && (
        <div className="pc-ch-badge">{unreadCount}</div>
      )}
    </div>
  );
}
