"use client";

import { useState } from "react";
import {
  useCommunities,
  useJoinCommunity,
  useCurrentProfile,
  useSession,
} from "@propian/shared/hooks";
import type { Community } from "@propian/shared/types";
import { createBrowserClient } from "@/lib/supabase/client";
import { useChatStore } from "@/stores/chat";
import { useQueryClient } from "@tanstack/react-query";
import { CreateCommunityDialog } from "./CreateCommunityDialog";

/* ─── Inline SVG Icons ─── */

const IcPlus = ({ s = 20 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export function CommunitySidebar() {
  const supabase = createBrowserClient();
  const queryClient = useQueryClient();
  const { data: session } = useSession(supabase);
  const { data: profile } = useCurrentProfile(supabase, session?.user?.id);
  const { data: communities } = useCommunities(supabase);
  const joinCommunity = useJoinCommunity(supabase);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { activeCommunityId, setActiveCommunity, setActiveView, setActiveChannel } =
    useChatStore();

  const isAdmin = profile?.is_admin === true;
  const userId = session?.user?.id;

  async function handleCommunityClick(id: string) {
    setActiveCommunity(id);
    setActiveView("community");
    setActiveChannel(null);

    // Auto-join public communities if not already a member
    if (userId) {
      try {
        const { data: membership } = await supabase
          .from("community_members")
          .select("user_id")
          .eq("community_id", id)
          .eq("user_id", userId)
          .maybeSingle();

        if (!membership) {
          await joinCommunity.mutateAsync(id);
          queryClient.invalidateQueries({ queryKey: ["community-channels", id] });
          queryClient.invalidateQueries({ queryKey: ["community-categories", id] });
        }
      } catch {
        // Non-critical — user can still view public community channels
      }
    }
  }

  function handleCommunityCreated(id: string) {
    setActiveCommunity(id);
    setActiveView("community");
    setActiveChannel(null);
  }

  return (
    <div className="pc-rail">
      {/* Community Icons */}
      {communities?.map((community: Community) => (
        <button
          key={community.id}
          className={`pc-rail-btn ${activeCommunityId === community.id ? "active" : ""}`}
          onClick={() => handleCommunityClick(community.id)}
          title={community.name}
        >
          {community.icon_url ? (
            <img
              src={community.icon_url}
              alt={community.name}
              className="pc-rail-icon"
            />
          ) : (
            <span className="pc-rail-letter">
              {community.name.charAt(0).toUpperCase()}
            </span>
          )}
        </button>
      ))}

      {/* Create Community (admin only) */}
      {isAdmin && (
        <>
          <button
            className="pc-rail-btn add"
            onClick={() => setShowCreateDialog(true)}
            title="Create Community"
          >
            <IcPlus s={20} />
          </button>

          {/* Create Community Dialog */}
          {showCreateDialog && (
            <CreateCommunityDialog
              onClose={() => setShowCreateDialog(false)}
              onCreated={handleCommunityCreated}
            />
          )}
        </>
      )}
    </div>
  );
}
