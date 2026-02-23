"use client";

import { useEffect } from "react";
import { useCommunities, useSession, useUnreadCountsMap } from "@propian/shared/hooks";
import { createBrowserClient } from "@/lib/supabase/client";
import { CommunitySidebar } from "@/components/chat/CommunitySidebar";
import { ChannelList } from "@/components/chat/ChannelList";
import { ChatArea } from "@/components/chat/ChatArea";
import { useChatStore } from "@/stores/chat";

export default function ChatPage() {
  const supabase = createBrowserClient();
  const { data: session } = useSession(supabase);
  const { data: communities } = useCommunities(supabase);
  const { activeCommunityId, setActiveCommunity, setActiveView, setUnreadCounts } = useChatStore();

  // Fetch unread counts and sync to Zustand store
  const { data: unreadCounts } = useUnreadCountsMap(supabase);
  useEffect(() => {
    if (unreadCounts) {
      setUnreadCounts(unreadCounts);
    }
  }, [unreadCounts, setUnreadCounts]);

  // Auto-select first community on load
  useEffect(() => {
    if (communities && communities.length > 0 && !activeCommunityId) {
      setActiveCommunity(communities[0].id);
      setActiveView("community");
    }
  }, [communities, activeCommunityId, setActiveCommunity, setActiveView]);

  if (!session) return null;

  return (
    <div className="pc-layout">
      <CommunitySidebar />
      <ChannelList communities={communities} />
      <ChatArea communities={communities} />
    </div>
  );
}
