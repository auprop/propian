"use client";

import { useCurrentProfile } from "@propian/shared/hooks";
import { createBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import Link from "next/link";

interface UserProfileOverlayProps {
  userId: string;
  onClose: () => void;
}

export function UserProfileOverlay({ userId, onClose }: UserProfileOverlayProps) {
  const supabase = createBrowserClient();
  const { data: profile } = useCurrentProfile(supabase, userId);

  if (!profile) return null;

  const displayName = profile.display_name ?? profile.username ?? "User";
  const username = profile.username ?? userId.slice(0, 8);

  return (
    <div className="pc-overlay" onClick={onClose}>
      <div className="pc-profile" onClick={(e) => e.stopPropagation()}>
        {/* Banner */}
        <div
          className="pc-profile-banner"
          style={{
            background: `linear-gradient(135deg, var(--lime), var(--lime-dim))`,
          }}
        >
          <div className="pc-profile-av">
            <Avatar
              src={profile.avatar_url}
              name={displayName}
              size="lg"
              showStatus
              isOnline
            />
          </div>
        </div>

        {/* Info */}
        <div className="pc-profile-info">
          <div style={{ fontSize: 20, fontWeight: 700 }}>{displayName}</div>
          <div className="pc-mono-xs" style={{ color: "var(--g400)" }}>@{username}</div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
            <div style={{ padding: 12, background: "var(--g50)", borderRadius: 12, border: "1px solid var(--g200)", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{profile.follower_count ?? 0}</div>
              <div className="pc-mono-xs" style={{ color: "var(--g400)" }}>FOLLOWERS</div>
            </div>
            <div style={{ padding: 12, background: "var(--g50)", borderRadius: 12, border: "1px solid var(--g200)", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{profile.following_count ?? 0}</div>
              <div className="pc-mono-xs" style={{ color: "var(--g400)" }}>FOLLOWING</div>
            </div>
          </div>

          {profile.bio && (
            <div style={{ fontSize: 12, color: "var(--g600)", marginTop: 12, lineHeight: 1.4 }}>
              {profile.bio}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pc-profile-actions">
          <Link
            href={`/profile/${username}`}
            className="pc-pbtn pri"
            onClick={onClose}
          >
            View Profile
          </Link>
          <button className="pc-pbtn sec" onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
