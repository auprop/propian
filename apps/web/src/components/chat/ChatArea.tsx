"use client";

import { useChatMessages, useSession, useCurrentProfile } from "@propian/shared/hooks";
import { IconSearch, IconUser, IconBookmark } from "@propian/shared/icons";
import type { Community } from "@propian/shared/types";
import { createBrowserClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/EmptyState";
import { useChatStore } from "@/stores/chat";
import { useChatPresence } from "@/hooks/useChatPresence";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { KnowledgeLibrary } from "./KnowledgeLibrary";
import { ChatSearch } from "./ChatSearch";
import { MemberSidebar } from "./MemberSidebar";

interface ChatAreaProps {
  communities?: Community[];
}

export function ChatArea({ communities }: ChatAreaProps) {
  const supabase = createBrowserClient();
  const { data: session } = useSession(supabase);
  const currentUserId = session?.user?.id;
  const { data: profile } = useCurrentProfile(supabase, currentUserId);

  const {
    activeChannelId,
    activeCommunityId,
    toggleSearch,
    toggleMemberList,
    toggleKnowledgeLibrary,
    typingUsers,
    knowledgeLibraryOpen,
    searchOpen,
    memberListOpen,
  } = useChatStore();

  const { data: messages, isLoading: messagesLoading } = useChatMessages(
    supabase,
    activeChannelId ?? ""
  );

  // Presence + typing
  const { broadcastTyping, stopTyping } = useChatPresence(
    supabase,
    currentUserId,
    profile?.display_name ?? undefined
  );

  // Get typing names for the active channel
  const typingNames = activeChannelId ? typingUsers[activeChannelId] ?? [] : [];

  const isInCommunity = !!activeCommunityId;

  if (!activeChannelId) {
    return (
      <div className="pt-chat-main">
        <div className="pt-chat-empty-area">
          <EmptyState
            title="Select a conversation"
            description="Choose a channel from the sidebar to start messaging."
          />
        </div>
      </div>
    );
  }

  // Determine header info — always community channel format
  let headerName = "# channel";
  let headerSub = "";

  const community = communities?.find((c) => c.id === activeCommunityId);
  const channel = community?.channels?.find((ch) => ch.id === activeChannelId);
  if (channel) {
    headerName = `# ${channel.name ?? "channel"}`;
    headerSub = community?.name ?? "";
  }

  const showSidePanel = (knowledgeLibraryOpen || searchOpen) && isInCommunity;
  const showMemberSidebar = memberListOpen && isInCommunity;

  // Build CSS class
  let mainClass = "pt-chat-main";
  if (showSidePanel) mainClass += " with-panel";
  if (showMemberSidebar && !showSidePanel) mainClass += " with-members";

  return (
    <div className={mainClass}>
      {/* Chat column */}
      <div className="pt-chat-main-content">
        {/* Header */}
        <div className="pt-chat-header">
          <div className="pt-chat-header-left">
            <div>
              <div className="pt-chat-header-name">{headerName}</div>
              {headerSub && <div className="pt-chat-header-status">{headerSub}</div>}
            </div>
          </div>
          <div className="pt-chat-header-actions">
            {/* Search */}
            <button
              className={`pt-chat-header-btn ${searchOpen ? "active" : ""}`}
              onClick={toggleSearch}
              title="Search messages"
            >
              <IconSearch size={16} />
            </button>

            {/* Knowledge Library */}
            {isInCommunity && (
              <button
                className={`pt-chat-header-btn ${knowledgeLibraryOpen ? "active" : ""}`}
                onClick={toggleKnowledgeLibrary}
                title="Knowledge Library"
              >
                <IconBookmark size={16} />
              </button>
            )}

            {/* Members */}
            {isInCommunity && (
              <button
                className={`pt-chat-header-btn ${memberListOpen ? "active" : ""}`}
                onClick={toggleMemberList}
                title="Members"
              >
                <IconUser size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          isLoading={messagesLoading}
          communityId={isInCommunity ? activeCommunityId ?? undefined : undefined}
          channelId={activeChannelId}
        />

        {/* Typing indicator */}
        <TypingIndicator typingNames={typingNames} />

        {/* Input */}
        <ChatInput
          roomId={activeChannelId}
          communityId={activeCommunityId ?? undefined}
          onTyping={() => broadcastTyping(activeChannelId)}
          onStopTyping={stopTyping}
        />
      </div>

      {/* Side panel: Knowledge Library or Search */}
      {showSidePanel && (
        <div className="pt-chat-side-panel">
          {knowledgeLibraryOpen && activeCommunityId && (
            <KnowledgeLibrary communityId={activeCommunityId} />
          )}
          {searchOpen && !knowledgeLibraryOpen && (
            <ChatSearch
              communityId={activeCommunityId}
              roomId={activeChannelId}
            />
          )}
        </div>
      )}

      {/* Member sidebar */}
      {showMemberSidebar && !showSidePanel && activeCommunityId && (
        <MemberSidebar communityId={activeCommunityId} />
      )}
    </div>
  );
}
