"use client";

import { useState, useEffect } from "react";
import {
  useCommunityChannels,
  useCommunityCategories,
  useSession,
  useCurrentProfile,
} from "@propian/shared/hooks";
import { IconChevDown, IconPlus } from "@propian/shared/icons";
import type { ChatRoom, CommunityCategory, Community } from "@propian/shared/types";
import { createBrowserClient } from "@/lib/supabase/client";
import { useChatStore } from "@/stores/chat";
import { Avatar } from "@/components/ui/Avatar";
import { CreateChannelDialog } from "./CreateChannelDialog";

const channelTypeIcon: Record<string, string> = {
  discussion: "#",
  setups: "#",
  signals: "#",
  resources: "#",
  qa: "?",
};

interface ChannelListProps {
  communities?: Community[];
}

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
    <div className="pt-chat-channels">
      {/* Community Header */}
      <div className="pt-chat-channels-header">
        <span className="pt-chat-channels-title">
          {activeCommunity?.name ?? "Community"}
        </span>
        {canManageChannels && activeCommunityId && (
          <button
            className="pt-chat-header-btn"
            onClick={() => handleCreateChannel()}
            title="Create Channel"
            type="button"
          >
            <IconPlus size={14} />
          </button>
        )}
      </div>

      {/* Channels grouped by category */}
      <div className="pt-chat-channels-list">
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

      {/* User bar at bottom */}
      {profile && (
        <div className="pt-chat-user-bar">
          <Avatar
            src={profile.avatar_url}
            name={profile.display_name ?? "User"}
            size="sm"
            showStatus
            isOnline
          />
          <div className="pt-chat-user-bar-info">
            <div className="pt-chat-user-bar-name">
              {profile.display_name ?? profile.username}
            </div>
            <div className="pt-chat-user-bar-status">Online</div>
          </div>
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
          <div key={cat.id} className="pt-chat-category">
            <button
              className="pt-chat-category-header"
              onClick={() => toggleCategory(cat.id)}
            >
              <IconChevDown
                size={12}
                style={{
                  transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                  transition: "transform 0.15s ease",
                }}
              />
              <span>{cat.name}</span>
              {canManageChannels && (
                <span
                  className="pt-chat-category-add"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateChannel(cat.id);
                  }}
                  title="Add channel to this category"
                >
                  <IconPlus size={12} />
                </span>
              )}
            </button>

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
  const prefix = channelTypeIcon[channel.channel_type ?? "discussion"] ?? "#";
  const hasUnread = unreadCount > 0;

  return (
    <div
      className={`pt-chat-channel-item ${isActive ? "active" : ""} ${hasUnread ? "unread" : ""}`}
      onClick={onClick}
    >
      <span className="pt-chat-channel-prefix">{prefix}</span>
      <span className="pt-chat-channel-name">
        {channel.name ?? "untitled"}
      </span>
      {hasUnread && !isActive && (
        <span className="pt-chat-channel-badge">{unreadCount}</span>
      )}
    </div>
  );
}
