"use client";

import { useMemo } from "react";
import { useCommunityMembers } from "@propian/shared/hooks";
import type { CommunityMember } from "@propian/shared/types";
import { createBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { useChatStore } from "@/stores/chat";

interface MemberSidebarProps {
  communityId: string;
}

export function MemberSidebar({ communityId }: MemberSidebarProps) {
  const supabase = createBrowserClient();
  const { data: members } = useCommunityMembers(supabase, communityId);
  const onlineUsers = useChatStore((s) => s.onlineUsers);

  const { online, offline } = useMemo(() => {
    if (!members) return { online: [], offline: [] };

    const onlineList: CommunityMember[] = [];
    const offlineList: CommunityMember[] = [];

    for (const member of members) {
      if (onlineUsers.has(member.user_id)) {
        onlineList.push(member);
      } else {
        offlineList.push(member);
      }
    }

    return { online: onlineList, offline: offlineList };
  }, [members, onlineUsers]);

  const totalMembers = (members?.length ?? 0);

  return (
    <div className="pt-member-sidebar">
      <div className="pt-member-sidebar-header">
        Members — {totalMembers}
      </div>
      <div className="pt-member-sidebar-list">
        {/* Online */}
        {online.length > 0 && (
          <>
            <div className="pt-member-group-label">
              Online — {online.length}
            </div>
            {online.map((m) => (
              <MemberRow key={m.user_id} member={m} isOffline={false} />
            ))}
          </>
        )}

        {/* Offline */}
        {offline.length > 0 && (
          <>
            <div className="pt-member-group-label">
              Offline — {offline.length}
            </div>
            {offline.map((m) => (
              <MemberRow key={m.user_id} member={m} isOffline={true} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function MemberRow({ member, isOffline }: { member: CommunityMember; isOffline: boolean }) {
  return (
    <div className={`pt-member-item ${isOffline ? "offline" : ""}`}>
      <Avatar
        src={member.user?.avatar_url}
        name={member.user?.display_name ?? "User"}
        size="sm"
        showStatus
        isOnline={!isOffline}
      />
      <span className="pt-member-item-name">
        {member.user?.display_name ?? "User"}
      </span>
      {member.role && member.role.name !== "member" && (
        <span className="pt-member-item-role">{member.role.name}</span>
      )}
    </div>
  );
}
