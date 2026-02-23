"use client";

import { useMemo } from "react";
import { useCommunityMembers } from "@propian/shared/hooks";
import type { CommunityMember } from "@propian/shared/types";
import { createBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { useChatStore } from "@/stores/chat";

interface MemberSidebarProps {
  communityId: string;
  onOpenProfile?: (userId: string) => void;
}

export function MemberSidebar({ communityId, onOpenProfile }: MemberSidebarProps) {
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

  return (
    <div className="pc-members">
      {/* Online */}
      {online.length > 0 && (
        <>
          <div className="pc-mgroup">ONLINE — {online.length}</div>
          {online.map((m) => (
            <MemberRow
              key={m.user_id}
              member={m}
              isOffline={false}
              onClick={() => onOpenProfile?.(m.user_id)}
            />
          ))}
        </>
      )}

      {/* Offline */}
      {offline.length > 0 && (
        <>
          <div className="pc-mgroup" style={{ marginTop: 16 }}>OFFLINE — {offline.length}</div>
          {offline.map((m) => (
            <MemberRow
              key={m.user_id}
              member={m}
              isOffline={true}
              onClick={() => onOpenProfile?.(m.user_id)}
            />
          ))}
        </>
      )}
    </div>
  );
}

function MemberRow({
  member,
  isOffline,
  onClick,
}: {
  member: CommunityMember;
  isOffline: boolean;
  onClick?: () => void;
}) {
  return (
    <div className={`pc-member ${isOffline ? "off" : ""}`} onClick={onClick}>
      <Avatar
        src={member.user?.avatar_url}
        name={member.user?.display_name ?? "User"}
        size="sm"
        showStatus
        isOnline={!isOffline}
      />
      <div>
        <div className="pc-mname">{member.user?.display_name ?? "User"}</div>
        <div className="pc-mrole">
          {member.role?.name && member.role.name !== "member"
            ? member.role.name
            : "Member"}
        </div>
      </div>
    </div>
  );
}
