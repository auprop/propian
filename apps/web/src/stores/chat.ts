"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ─── Types ─── */

interface UnreadInfo {
  count: number;
  mentions: number;
}

/* ─── Store Shape ─── */

interface ChatState {
  /** Navigation */
  activeCommunityId: string | null;
  activeChannelId: string | null;
  activeView: "dms" | "community";

  /** UI panels */
  memberListOpen: boolean;
  knowledgeLibraryOpen: boolean;
  searchOpen: boolean;

  /** Message drafts (persisted) */
  drafts: Record<string, string>;

  /** Unread counts per channel */
  unreadCounts: Record<string, UnreadInfo>;

  /** Presence */
  onlineUsers: Set<string>;
  typingUsers: Record<string, string[]>; // channelId → userIds

  /** Navigation actions */
  setActiveCommunity: (id: string | null) => void;
  setActiveChannel: (id: string | null) => void;
  setActiveView: (view: "dms" | "community") => void;

  /** UI actions — mutually exclusive panels */
  toggleMemberList: () => void;
  toggleKnowledgeLibrary: () => void;
  toggleSearch: () => void;

  /** Draft actions */
  setDraft: (channelId: string, text: string) => void;
  getDraft: (channelId: string) => string;
  clearDraft: (channelId: string) => void;

  /** Unread actions */
  setUnreadCounts: (counts: Record<string, UnreadInfo>) => void;
  markChannelRead: (channelId: string) => void;

  /** Presence actions */
  setOnlineUsers: (ids: string[]) => void;
  setTypingUsers: (channelId: string, userIds: string[]) => void;
}

/* ─── Store ─── */

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Navigation
      activeCommunityId: null,
      activeChannelId: null,
      activeView: "community",

      // UI
      memberListOpen: false,
      knowledgeLibraryOpen: false,
      searchOpen: false,

      // Drafts
      drafts: {},

      // Unread
      unreadCounts: {},

      // Presence
      onlineUsers: new Set<string>(),
      typingUsers: {},

      // Navigation actions
      setActiveCommunity: (id) =>
        set({ activeCommunityId: id, activeView: id ? "community" : "dms" }),
      setActiveChannel: (id) => set({ activeChannelId: id }),
      setActiveView: (view) => set({ activeView: view }),

      // UI actions — mutually exclusive: opening one closes the others
      toggleMemberList: () =>
        set((s) => ({
          memberListOpen: !s.memberListOpen,
          knowledgeLibraryOpen: false,
          searchOpen: false,
        })),
      toggleKnowledgeLibrary: () =>
        set((s) => ({
          knowledgeLibraryOpen: !s.knowledgeLibraryOpen,
          memberListOpen: false,
          searchOpen: false,
        })),
      toggleSearch: () =>
        set((s) => ({
          searchOpen: !s.searchOpen,
          memberListOpen: false,
          knowledgeLibraryOpen: false,
        })),

      // Draft actions
      setDraft: (channelId, text) =>
        set((s) => ({
          drafts: { ...s.drafts, [channelId]: text },
        })),
      getDraft: (channelId) => get().drafts[channelId] || "",
      clearDraft: (channelId) =>
        set((s) => {
          const { [channelId]: _, ...rest } = s.drafts;
          return { drafts: rest };
        }),

      // Unread actions
      setUnreadCounts: (counts) => set({ unreadCounts: counts }),
      markChannelRead: (channelId) =>
        set((s) => ({
          unreadCounts: {
            ...s.unreadCounts,
            [channelId]: { count: 0, mentions: 0 },
          },
        })),

      // Presence actions
      setOnlineUsers: (ids) => set({ onlineUsers: new Set(ids) }),
      setTypingUsers: (channelId, userIds) =>
        set((s) => ({
          typingUsers: { ...s.typingUsers, [channelId]: userIds },
        })),
    }),
    {
      name: "propian-chat",
      // Only persist drafts — everything else is ephemeral
      partialize: (state) => ({
        drafts: state.drafts,
      }),
    }
  )
);
