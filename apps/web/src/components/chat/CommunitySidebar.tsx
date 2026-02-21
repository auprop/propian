"use client";

import { useState } from "react";
import {
  useCommunities,
  useCommunityMembers,
  useJoinCommunity,
  useCurrentProfile,
  useSession,
} from "@propian/shared/hooks";
import { IconPlus } from "@propian/shared/icons";
import type { Community } from "@propian/shared/types";
import { createBrowserClient } from "@/lib/supabase/client";
import { useChatStore } from "@/stores/chat";
import { useQueryClient } from "@tanstack/react-query";
import { CreateCommunityDialog } from "./CreateCommunityDialog";

export function CommunitySidebar() {
  const supabase = createBrowserClient();
  const queryClient = useQueryClient();
  const { data: session } = useSession(supabase);
  const { data: profile } = useCurrentProfile(supabase, session?.user?.id);
  const { data: communities } = useCommunities(supabase);
  const joinCommunity = useJoinCommunity(supabase);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { activeCommunityId, activeView, setActiveCommunity, setActiveView, setActiveChannel } =
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
        // Check membership via a quick query
        const { data: membership } = await supabase
          .from("community_members")
          .select("user_id")
          .eq("community_id", id)
          .eq("user_id", userId)
          .maybeSingle();

        if (!membership) {
          await joinCommunity.mutateAsync(id);
          // Invalidate channel/category queries so they load
          queryClient.invalidateQueries({ queryKey: ["community-channels", id] });
          queryClient.invalidateQueries({ queryKey: ["community-categories", id] });
        }
      } catch {
        // Non-critical — user can still view public community channels
        // via the updated RLS policy
      }
    }
  }

  function handleCommunityCreated(id: string) {
    setActiveCommunity(id);
    setActiveView("community");
    setActiveChannel(null);
  }

  return (
    <div className="pt-chat-rail">
      {/* Community Icons */}
      {communities?.map((community: Community) => (
        <button
          key={community.id}
          className={`pt-chat-rail-btn community ${activeCommunityId === community.id ? "active" : ""}`}
          onClick={() => handleCommunityClick(community.id)}
          title={community.name}
        >
          {community.icon_url ? (
            <img
              src={community.icon_url}
              alt={community.name}
              className="pt-chat-rail-icon"
            />
          ) : (
            <span className="pt-chat-rail-letter">
              {community.name.charAt(0).toUpperCase()}
            </span>
          )}
        </button>
      ))}

      {/* Create Community — admin only */}
      {isAdmin && (
        <button
          className="pt-chat-rail-btn add"
          onClick={() => setShowCreateDialog(true)}
          title="Create Community"
        >
          <IconPlus size={20} />
        </button>
      )}

      {/* Create Community Dialog */}
      {showCreateDialog && (
        <CreateCommunityDialog
          onClose={() => setShowCreateDialog(false)}
          onCreated={handleCommunityCreated}
        />
      )}
    </div>
  );
}
