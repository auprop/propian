"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useChatMessages, useSession, useCurrentProfile, useUpdateReadState, useCommunityChannels, useCommunityMembers, useThreadReplies, useSendMessage, useUnpinByMessageId } from "@propian/shared/hooks";
import type { Community, Message, ChatRoom } from "@propian/shared/types";
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
import { ChatRightSidebar } from "./ChatRightSidebar";
import { UserProfileOverlay } from "./UserProfileOverlay";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatTime } from "@propian/shared/utils";

/* ─── Inline SVG Icons ─── */

const IcHash = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

const IcSearch = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IcPin = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" />
  </svg>
);

const IcUsers = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IcThread = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7h5l2 3h8" /><path d="M3 11h5l2 3h8" /><path d="M3 15h5l2 3h8" />
  </svg>
);

const IcX = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IcSend = ({ s = 15 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

/* ─── Types ─── */

interface ChatAreaProps {
  communities?: Community[];
}

/* ─── Pinned Messages Panel ─── */

function PinnedPanel({
  messages,
  canPin,
  onClose,
}: {
  messages: Message[];
  canPin?: boolean;
  onClose: () => void;
}) {
  const pinnedMessages = messages?.filter((m) => m.is_pinned_to_library) ?? [];

  return (
    <div className="pc-rpanel" style={{ width: 320 }}>
      <div className="pc-rpanel-head">
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Pinned Messages</div>
          <div className="pc-mono-xs" style={{ color: "var(--g400)" }}>
            {pinnedMessages.length} {pinnedMessages.length === 1 ? "message" : "messages"}
          </div>
        </div>
        <button className="pc-ibtn" onClick={onClose} type="button"><IcX s={18} /></button>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {pinnedMessages.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--g400)", fontSize: 13 }}>
            No pinned messages yet
          </div>
        ) : (
          pinnedMessages.map((m) => (
            <PinnedPanelItem key={m.id} message={m} canPin={canPin} />
          ))
        )}
      </div>
    </div>
  );
}

function PinnedPanelItem({ message, canPin }: { message: Message; canPin?: boolean }) {
  const supabase = createBrowserClient();
  const unpinMutation = useUnpinByMessageId(supabase);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleUnpin() {
    unpinMutation.mutate(message.id, {
      onSuccess: () => setConfirmOpen(false),
    });
  }

  return (
    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--g100)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Avatar
          src={message.author?.avatar_url}
          name={message.author?.display_name ?? "User"}
          size="sm"
        />
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{message.author?.display_name}</span>
        {canPin && (
          <button
            className="pc-ibtn pc-unpin-btn"
            onClick={() => setConfirmOpen(true)}
            title="Unpin"
            type="button"
          >
            <IcX s={14} />
          </button>
        )}
      </div>
      <div style={{ fontSize: 13, color: "var(--g600)", lineHeight: 1.4 }}>
        {message.type === "image" ? "[Image]" : stripHtml(message.content).slice(0, 120)}
      </div>
      <div className="pc-mono-xs" style={{ color: "var(--g400)", marginTop: 4 }}>
        {formatTime(message.created_at)}
      </div>

      {confirmOpen && (
        <ConfirmDialog
          title="Unpin message"
          message="This will remove the message from the Knowledge Library. Other members will no longer see it as pinned."
          confirmLabel="Unpin"
          variant="danger"
          isPending={unpinMutation.isPending}
          onConfirm={handleUnpin}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}

/* ─── Thread Panel ─── */

function ThreadPanel({
  parentMessage,
  roomId,
  onClose,
  onOpenProfile,
}: {
  parentMessage: Message;
  roomId: string;
  onClose: () => void;
  onOpenProfile?: (userId: string) => void;
}) {
  const supabase = createBrowserClient();
  const { data: replies, isLoading } = useThreadReplies(supabase, parentMessage.id);
  const sendMessage = useSendMessage(supabase);
  const [replyText, setReplyText] = useState("");
  const repliesEndRef = useRef<HTMLDivElement>(null);
  const replyCount = replies?.length ?? parentMessage.reply_count ?? 0;

  // Auto-scroll when new replies arrive
  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies?.length]);

  async function handleSendReply() {
    const text = replyText.trim();
    if (!text || sendMessage.isPending) return;
    await sendMessage.mutateAsync({
      roomId,
      content: text,
      type: "text",
      parent_message_id: parentMessage.id,
    });
    setReplyText("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  }

  return (
    <div className="pc-rpanel">
      <div className="pc-rpanel-head">
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Thread</div>
          <div className="pc-mono-xs" style={{ color: "var(--g400)" }}>
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </div>
        </div>
        <button className="pc-ibtn" onClick={onClose} type="button"><IcX s={18} /></button>
      </div>
      <div className="pc-msgs" style={{ flex: 1 }}>
        {/* Parent (original) message */}
        <div className="pc-msg pc-msg-thread-parent">
          <div
            style={{ cursor: "pointer" }}
            onClick={() => parentMessage.user_id && onOpenProfile?.(parentMessage.user_id)}
          >
            <Avatar
              src={parentMessage.author?.avatar_url}
              name={parentMessage.author?.display_name ?? "User"}
              size="chat"
            />
          </div>
          <div className="pc-msg-bubble pc-msg-bubble-parent">
            <div className="pc-msg-body">
              <div className="pc-msg-head">
                <span
                  className="pc-msg-user"
                  onClick={() => parentMessage.user_id && onOpenProfile?.(parentMessage.user_id)}
                >
                  {parentMessage.author?.display_name}
                </span>
                <span className="pc-mono-xs" style={{ color: "var(--g400)" }}>
                  {formatTime(parentMessage.created_at)}
                </span>
              </div>
              {parentMessage.type === "image" ? (
                <div className="pc-msg-img" style={{ maxWidth: 240 }}>
                  <img
                    src={parentMessage.content}
                    alt="Shared image"
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }}
                  />
                </div>
              ) : (
                <div className="pc-msg-text" dangerouslySetInnerHTML={{ __html: parentMessage.content }} />
              )}
            </div>
          </div>
        </div>

        {/* Separator */}
        {replyCount > 0 && (
          <div className="pc-thread-sep">
            <span>{replyCount} {replyCount === 1 ? "reply" : "replies"}</span>
          </div>
        )}

        {/* Replies */}
        {isLoading && (
          <div style={{ padding: "12px 16px", color: "var(--g400)", fontSize: 13 }}>
            Loading replies...
          </div>
        )}
        {replies?.map((reply, idx) => {
          const prev = idx > 0 ? replies[idx - 1] : null;
          const isGrouped =
            prev !== null &&
            prev.user_id === reply.user_id &&
            new Date(reply.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000;

          return (
            <div key={reply.id} className="pc-msg">
              {!isGrouped ? (
                <div
                  style={{ cursor: "pointer" }}
                  onClick={() => reply.user_id && onOpenProfile?.(reply.user_id)}
                >
                  <Avatar
                    src={reply.author?.avatar_url}
                    name={reply.author?.display_name ?? "User"}
                    size="chat"
                  />
                </div>
              ) : (
                <div style={{ width: 38, flexShrink: 0 }} />
              )}
              <div className={`pc-msg-bubble${isGrouped ? " pc-msg-bubble-grouped" : ""}`}>
                <div className="pc-msg-body">
                  {!isGrouped && (
                    <div className="pc-msg-head">
                      <span
                        className="pc-msg-user"
                        onClick={() => reply.user_id && onOpenProfile?.(reply.user_id)}
                      >
                        {reply.author?.display_name ?? "User"}
                      </span>
                      <span className="pc-mono-xs" style={{ color: "var(--g400)" }}>
                        {formatTime(reply.created_at)}
                      </span>
                    </div>
                  )}
                  {reply.type === "image" ? (
                    <div className="pc-msg-img" style={{ maxWidth: 200 }}>
                      <img
                        src={reply.content}
                        alt="Shared image"
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }}
                      />
                    </div>
                  ) : (
                    <div className="pc-msg-text" dangerouslySetInnerHTML={{ __html: reply.content }} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={repliesEndRef} />
      </div>

      {/* Thread reply input */}
      <div className="pc-input-area">
        <div className="pc-input-wrap">
          <input
            className="pc-input"
            placeholder="Reply to thread..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className={`pc-send ${replyText.trim() ? "" : "disabled"}`}
            onClick={handleSendReply}
            disabled={!replyText.trim() || sendMessage.isPending}
            type="button"
          >
            <IcSend s={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Helper ─── */

function stripHtml(html: string): string {
  if (typeof document !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent ?? div.innerText ?? "";
  }
  return html.replace(/<[^>]*>/g, "");
}

/* ─── Main Chat Area ─── */

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
    markChannelRead,
  } = useChatStore();

  const { data: messages, isLoading: messagesLoading } = useChatMessages(
    supabase,
    activeChannelId ?? ""
  );

  // Mark channel as read when viewing it or when new messages arrive
  const updateReadState = useUpdateReadState(supabase);
  const lastMarkedRef = useRef<string | null>(null);

  // Reset ref when switching channels
  useEffect(() => {
    lastMarkedRef.current = null;
  }, [activeChannelId]);

  useEffect(() => {
    if (!activeChannelId || !messages || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg?.id || lastMsg.id === lastMarkedRef.current) return;
    lastMarkedRef.current = lastMsg.id;
    // Update DB read state — the onSuccess invalidation will refetch unread counts
    updateReadState.mutate({ channelId: activeChannelId, lastReadMessageId: lastMsg.id });
    // Immediately clear the badge in the UI for the active channel
    markChannelRead(activeChannelId);
  }, [activeChannelId, messages]);

  // Presence + typing
  const { broadcastTyping, stopTyping } = useChatPresence(
    supabase,
    currentUserId,
    profile?.display_name ?? undefined
  );

  // Get typing names for the active channel
  const typingNames = activeChannelId ? typingUsers[activeChannelId] ?? [] : [];

  const isInCommunity = !!activeCommunityId;

  // Fetch channels to determine active channel permissions
  const { data: channels } = useCommunityChannels(supabase, activeCommunityId ?? "");
  const activeChannel = channels?.find((ch: ChatRoom) => ch.id === activeChannelId);
  const isLockedChannel = activeChannel?.permissions_override !== null
    && activeChannel?.permissions_override !== undefined
    && (activeChannel.permissions_override as Record<string, unknown>)?.can_send_messages === false;

  // Check if current user is admin/owner (can bypass locked channels)
  const community = communities?.find((c) => c.id === activeCommunityId);
  const isAdmin = profile?.is_admin === true;
  const isOwner = community?.owner_id === currentUserId;
  const canSendInChannel = !isLockedChannel || isAdmin || isOwner;

  // Check community membership for non-public communities
  const { data: communityMembers } = useCommunityMembers(supabase, activeCommunityId ?? "");
  const isMember = isAdmin || isOwner || communityMembers?.some((m) => m.user_id === currentUserId);
  const canSend = canSendInChannel && (isMember || !isInCommunity);

  // Pin permission: admin, owner, or role has can_pin_messages
  const currentMember = communityMembers?.find((m) => m.user_id === currentUserId);
  const canPin = isAdmin || isOwner || (currentMember?.role?.permissions?.can_pin_messages === true);

  // Pinned messages for banner
  const pinnedMessages = useMemo(
    () => messages?.filter((m) => m.is_pinned_to_library === true) ?? [],
    [messages]
  );

  // Panel states
  const [showThread, setShowThread] = useState(false);
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);
  const [showPinned, setShowPinned] = useState(false);
  const [showProfileOverlay, setShowProfileOverlay] = useState<string | null>(null);

  if (!activeChannelId) {
    return (
      <div className="pc-chat">
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <EmptyState
            title="Select a conversation"
            description="Choose a channel from the sidebar to start messaging."
          />
        </div>
      </div>
    );
  }

  // Determine header info
  const channelName = activeChannel?.name ?? "channel";

  // Determine which right panel is showing
  const hasRightPanel = showThread || showPinned || knowledgeLibraryOpen || searchOpen;

  function handleToggleThread() {
    setShowThread(!showThread);
    setShowPinned(false);
    // Close knowledge/search
    if (knowledgeLibraryOpen) toggleKnowledgeLibrary();
    if (searchOpen) toggleSearch();
  }

  function handleTogglePinned() {
    setShowPinned(!showPinned);
    setShowThread(false);
    if (knowledgeLibraryOpen) toggleKnowledgeLibrary();
    if (searchOpen) toggleSearch();
  }

  function handleToggleSearch() {
    toggleSearch();
    setShowThread(false);
    setShowPinned(false);
  }

  function handleToggleMembers() {
    toggleMemberList();
    // Members and right panels can coexist in the reference design
  }

  function handleOpenThread(msg: Message) {
    setThreadMessage(msg);
    setShowThread(true);
    setShowPinned(false);
  }

  function handleOpenProfile(userId: string) {
    setShowProfileOverlay(userId);
  }

  return (
    <>
      <div className="pc-chat">
        {/* Header */}
        <div className="pc-chat-head">
          <div className="pc-chat-title">
            <IcHash s={18} /> {channelName}
          </div>
          <div className="pc-chat-desc">
            Share ideas, charts, and analysis with the community
          </div>
          <div className="pc-chat-acts">
            <button
              className={`pc-hbtn ${showThread ? "on" : ""}`}
              onClick={handleToggleThread}
              title="Threads"
              type="button"
            >
              <IcThread s={18} />
            </button>
            <button
              className={`pc-hbtn ${showPinned ? "on" : ""}`}
              onClick={handleTogglePinned}
              title="Pinned Messages"
              type="button"
            >
              <IcPin s={18} />
            </button>
            <button
              className={`pc-hbtn ${searchOpen ? "on" : ""}`}
              onClick={handleToggleSearch}
              title="Search"
              type="button"
            >
              <IcSearch s={18} />
            </button>
            <button
              className={`pc-hbtn ${memberListOpen && !hasRightPanel ? "on" : ""}`}
              onClick={handleToggleMembers}
              title="Members"
              type="button"
            >
              <IcUsers s={18} />
            </button>
          </div>
        </div>

        {/* Pinned Messages Banner */}
        {pinnedMessages.length > 0 && (
          <div className="pc-pinned-banner" onClick={handleTogglePinned}>
            <div className="pc-pinned-banner-icon">
              <IcPin s={16} />
            </div>
            <div className="pc-pinned-banner-content">
              <div className="pc-pinned-banner-label">Pinned</div>
              <div className="pc-pinned-banner-text">
                <strong>{pinnedMessages[pinnedMessages.length - 1]?.author?.display_name}</strong>
                {": "}
                {stripHtml(pinnedMessages[pinnedMessages.length - 1]?.content ?? "").slice(0, 80)}
              </div>
            </div>
            <div className="pc-pinned-banner-count">
              {pinnedMessages.length} pinned
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        )}

        {/* Messages */}
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          isLoading={messagesLoading}
          communityId={isInCommunity ? activeCommunityId ?? undefined : undefined}
          channelId={activeChannelId}
          canPin={canPin}
          onOpenThread={handleOpenThread}
          onOpenProfile={handleOpenProfile}
        />

        {/* Typing indicator */}
        <TypingIndicator typingNames={typingNames} />

        {/* Input */}
        {canSend ? (
          <ChatInput
            roomId={activeChannelId}
            communityId={activeCommunityId ?? undefined}
            onTyping={() => broadcastTyping(activeChannelId)}
            onStopTyping={stopTyping}
          />
        ) : (
          <div className="pc-input-area">
            <div className="pc-input-disabled">
              {isLockedChannel
                ? "Only admins can send messages in this channel."
                : "You must be a member to send messages."}
            </div>
          </div>
        )}
      </div>

      {/* Right panels: Members (when no other panel) */}
      {memberListOpen && !showThread && !showPinned && !knowledgeLibraryOpen && !searchOpen && isInCommunity && activeCommunityId && (
        <MemberSidebar communityId={activeCommunityId} onOpenProfile={handleOpenProfile} />
      )}

      {/* Thread Panel */}
      {showThread && threadMessage && (
        <ThreadPanel
          parentMessage={threadMessage}
          roomId={activeChannelId}
          onClose={() => setShowThread(false)}
          onOpenProfile={handleOpenProfile}
        />
      )}

      {/* Pinned Panel */}
      {showPinned && messages && (
        <PinnedPanel
          messages={messages}
          canPin={canPin}
          onClose={() => setShowPinned(false)}
        />
      )}

      {/* Knowledge Library */}
      {knowledgeLibraryOpen && activeCommunityId && (
        <div className="pc-rpanel">
          <KnowledgeLibrary communityId={activeCommunityId} />
        </div>
      )}

      {/* Search */}
      {searchOpen && !knowledgeLibraryOpen && (
        <div className="pc-rpanel">
          <ChatSearch
            communityId={activeCommunityId}
            roomId={activeChannelId}
          />
        </div>
      )}

      {/* Default right sidebar: News + Ads (when no panel is open) */}
      {!hasRightPanel && !memberListOpen && isInCommunity && (
        <ChatRightSidebar />
      )}

      {/* User Profile Overlay */}
      {showProfileOverlay && (
        <UserProfileOverlay
          userId={showProfileOverlay}
          onClose={() => setShowProfileOverlay(null)}
        />
      )}
    </>
  );
}
