"use client";

import { useParams } from "next/navigation";
import { useProfile, useCurrentProfile, useFollow, useFollowStatus, useSession } from "@propian/shared/hooks";
import type { Profile, Badge as BadgeType, FollowStatus } from "@propian/shared/types";
import { IconVerified, IconTrendUp, IconAward, IconChart, IconBarChart } from "@propian/shared/icons";
import { formatCompact } from "@propian/shared/utils";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

// Placeholder badges -- in production these come from an API
const sampleBadges: BadgeType[] = [
  { name: "Early Adopter", description: "Joined during beta", icon: "star", color: "lime" },
  { name: "Top Reviewer", description: "Wrote 10+ firm reviews", icon: "award", color: "amber" },
  { name: "Profitable", description: "3 consecutive profitable months", icon: "chart", color: "green" },
];

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const supabase = createBrowserClient();

  const { data: session } = useSession(supabase);
  const { data: profile, isLoading } = useProfile(supabase, params.username);
  const { follow, unfollow } = useFollow(supabase);
  const { data: followStatus } = useFollowStatus(supabase, profile?.id ?? "");

  const isOwnProfile = session?.user?.id === profile?.id;
  const isFollowing = followStatus === "following";

  function handleFollowToggle() {
    if (!profile) return;
    if (isFollowing) {
      unfollow.mutate(profile.id);
    } else {
      follow.mutate(profile.id);
    }
  }

  // Loading
  if (isLoading) {
    return (
      <div className="pt-container">
        <div className="pt-profile-header">
          <Skeleton width="100%" height={120} borderRadius={0} />
          <div style={{ padding: "0 16px", marginTop: -40 }}>
            <Skeleton width={80} height={80} borderRadius="50%" />
            <Skeleton width={160} height={22} />
            <Skeleton width={100} height={14} />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="pt-container">
        <EmptyState title="User not found" description="This profile does not exist." />
      </div>
    );
  }

  return (
    <div className="pt-container">
      {/* Profile Header */}
      <div className="pt-profile-header">
        {/* Banner */}
        <div
          style={{
            width: "100%",
            height: 120,
            background: "linear-gradient(135deg, var(--g50) 0%, var(--lime-10) 100%)",
            borderRadius: "var(--r-lg) var(--r-lg) 0 0",
          }}
        />
        {/* Avatar + Info */}
        <div style={{ padding: "0 16px", marginTop: -40, paddingBottom: 16 }}>
          <Avatar
            src={profile.avatar_url}
            name={profile.display_name}
            size="xl"
          />
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
                {profile.display_name}
              </h1>
              {profile.is_verified && (
                <IconVerified size={20} style={{ color: "var(--lime)" }} />
              )}
            </div>
            <div style={{ fontSize: 14, opacity: 0.5, marginTop: 2 }}>
              @{profile.username}
            </div>
            {profile.bio && (
              <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 8, opacity: 0.85 }} dir="auto">
                {profile.bio}
              </p>
            )}
            {(profile.trading_style || profile.experience_level) && (
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {profile.trading_style && (
                  <Badge variant="lime">
                    {profile.trading_style.replace("-", " ")}
                  </Badge>
                )}
                {profile.experience_level && (
                  <Badge>{profile.experience_level}</Badge>
                )}
              </div>
            )}
          </div>

          {/* Follow / Edit Button */}
          {isOwnProfile ? (
            <div style={{ marginTop: 12 }}>
              <Button
                variant="ghost"
                onClick={() => window.location.href = "/settings"}
              >
                Edit Profile
              </Button>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <Button
                variant={isFollowing ? "ghost" : "primary"}
                onClick={handleFollowToggle}
                disabled={follow.isPending || unfollow.isPending}
              >
                {isFollowing ? "Unfollow" : "Follow"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          padding: "16px 0",
          borderBottom: "1px solid var(--g200)",
          marginBottom: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>
            {formatCompact(profile.follower_count)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.5 }}>Followers</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>
            {formatCompact(profile.following_count)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.5 }}>Following</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>
            {formatCompact(profile.post_count)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.5 }}>Posts</div>
        </div>
      </div>

      {/* Badges Grid */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Badges</h3>
        <div className="pt-badge-grid">
          {sampleBadges.map((badge) => (
            <div
              key={badge.name}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: 16,
                borderRadius: "var(--r-md)",
                background: "var(--g50)",
                border: "1px solid var(--g200)",
                textAlign: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: `var(--${badge.color}-bg, var(--g50))`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconAward size={20} style={{ color: `var(--${badge.color}, var(--black))` }} />
              </div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{badge.name}</div>
              <div style={{ fontSize: 11, opacity: 0.5 }}>{badge.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Trading Stats */}
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Trading Stats</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          <div
            style={{
              padding: 16,
              borderRadius: "var(--r-md)",
              background: "var(--g50)",
              border: "1px solid var(--g200)",
              textAlign: "center",
            }}
          >
            <IconTrendUp size={20} style={{ color: "var(--green)", marginBottom: 4 }} />
            <div style={{ fontWeight: 700, fontSize: 20 }}>67%</div>
            <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>Win Rate</div>
          </div>
          <div
            style={{
              padding: 16,
              borderRadius: "var(--r-md)",
              background: "var(--g50)",
              border: "1px solid var(--g200)",
              textAlign: "center",
            }}
          >
            <IconChart size={20} style={{ color: "var(--lime)", marginBottom: 4 }} />
            <div style={{ fontWeight: 700, fontSize: 20 }}>1.8</div>
            <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>Profit Factor</div>
          </div>
          <div
            style={{
              padding: 16,
              borderRadius: "var(--r-md)",
              background: "var(--g50)",
              border: "1px solid var(--g200)",
              textAlign: "center",
            }}
          >
            <IconBarChart size={20} style={{ color: "var(--blue)", marginBottom: 4 }} />
            <div style={{ fontWeight: 700, fontSize: 20 }}>2.4</div>
            <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>Avg RR</div>
          </div>
        </div>
      </div>
    </div>
  );
}
