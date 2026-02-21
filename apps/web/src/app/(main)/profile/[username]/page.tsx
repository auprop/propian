"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useProfile, useFollow, useFollowStatus, useSession, useUserPosts, useLikePost, useBookmark } from "@propian/shared/hooks";
import type { Badge as BadgeType, Post } from "@propian/shared/types";
import {
  IconVerified,
  IconShare,
  IconMail,
  IconTrendUp,
  IconChart,
  IconStar,
  IconAward,
  IconHeart,
  IconHeartOutline,
  IconComment,
  IconBookmark,
  IconRepost,
  IconQuote,
  IconEye,
} from "@propian/shared/icons";
import { formatCompact, timeAgo } from "@propian/shared/utils";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

// Placeholder badges -- in production these come from an API
const sampleBadges = [
  { name: "Early Adopter", icon: "star", variant: "green" as const },
  { name: "Top Reviewer", icon: "award", variant: "amber" as const },
  { name: "Profitable", icon: "chart", variant: "green" as const },
];

const BADGE_ICONS: Record<string, typeof IconStar> = {
  star: IconStar,
  award: IconAward,
  chart: IconChart,
};

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const supabase = createBrowserClient();
  const [activeTab, setActiveTab] = useState("posts");

  const { data: session } = useSession(supabase);
  const { data: profile, isLoading } = useProfile(supabase, params.username);
  const { follow, unfollow } = useFollow(supabase);
  const { data: followStatus } = useFollowStatus(supabase, profile?.id ?? "");

  const { data: postsData, isLoading: postsLoading } = useUserPosts(supabase, profile?.id);
  const posts = useMemo(
    () => postsData?.pages.flatMap((p) => p.data) ?? [],
    [postsData]
  );

  const likeMutation = useLikePost(supabase);
  const bookmarkMutation = useBookmark(supabase);

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
          <Skeleton width="100%" height={128} borderRadius={0} />
          <div style={{ display: "flex", gap: 20, padding: "0 24px 24px" }}>
            <div style={{ marginTop: -40 }}>
              <Skeleton width={96} height={96} borderRadius="50%" />
            </div>
            <div style={{ paddingTop: 12, flex: 1 }}>
              <Skeleton width={200} height={24} />
              <Skeleton width={140} height={14} />
              <Skeleton width={300} height={14} />
            </div>
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

      {/* ─── Profile Card ─── */}
      <div className="pt-profile-header">

        {/* Banner */}
        <div className="pt-profile-banner">
          <div className="pt-profile-banner-actions">
            <button className="pt-profile-banner-btn">
              <IconShare size={12} /> Share
            </button>
            <button className="pt-profile-banner-btn">
              ···
            </button>
          </div>
        </div>

        {/* Profile Row: Avatar + Info + Right side */}
        <div className="pt-profile-row">

          {/* Avatar */}
          <div className="pt-profile-avatar">
            <Avatar
              src={profile.avatar_url}
              name={profile.display_name}
              size="xl"
            />
          </div>

          {/* Main info column */}
          <div className="pt-profile-main">

            {/* Name + verified + handle */}
            <div className="pt-profile-name">
              {profile.display_name}
              {profile.is_verified && (
                <IconVerified size={18} style={{ color: "var(--lime)" }} />
              )}
              <span className="pt-profile-handle">@{profile.username}</span>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="pt-profile-bio" dir="auto">{profile.bio}</p>
            )}

            {/* Tags + Mini Badges Row */}
            <div className="pt-profile-tags-badges">
              {/* Trading style / experience tags */}
              <div className="pt-profile-meta">
                {profile.trading_style && (
                  <Badge variant="lime">
                    {profile.trading_style.replace("-", " ").toUpperCase()}
                  </Badge>
                )}
                {profile.experience_level && (
                  <Badge variant="">
                    {profile.experience_level.toUpperCase()}
                  </Badge>
                )}
              </div>

              {/* Divider */}
              {sampleBadges.length > 0 && (
                <div className="pt-profile-divider" />
              )}

              {/* Mini badges */}
              {sampleBadges.map((badge) => {
                const BadgeIcon = BADGE_ICONS[badge.icon] || IconAward;
                return (
                  <span
                    key={badge.name}
                    className={`pt-profile-mini-badge ${badge.variant}`}
                    title={badge.name}
                  >
                    <BadgeIcon size={12} />
                    {badge.name}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Right column: actions + stats */}
          <div className="pt-profile-right">
            {/* Action buttons */}
            <div className="pt-profile-actions-row">
              {isOwnProfile ? (
                <Button
                  variant="ghost"
                  onClick={() => window.location.href = "/settings"}
                >
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button
                    variant={isFollowing ? "ghost" : "primary"}
                    onClick={handleFollowToggle}
                    disabled={follow.isPending || unfollow.isPending}
                  >
                    {isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                  <button
                    className="pt-btn icon-only primary"
                    title="Message"
                  >
                    <IconMail size={14} />
                  </button>
                </>
              )}
            </div>

            {/* Compact inline stats */}
            <div className="pt-profile-compact-stats">
              <div className="pt-profile-compact-stat">
                <span className="pt-profile-compact-stat-val">
                  {formatCompact(profile.follower_count)}
                </span>
                <span className="pt-profile-compact-stat-label">Followers</span>
              </div>
              <div className="pt-profile-stat-divider" />
              <div className="pt-profile-compact-stat">
                <span className="pt-profile-compact-stat-val">
                  {formatCompact(profile.following_count)}
                </span>
                <span className="pt-profile-compact-stat-label">Following</span>
              </div>
              <div className="pt-profile-stat-divider" />
              <div className="pt-profile-compact-stat">
                <span className="pt-profile-compact-stat-val">
                  {formatCompact(profile.post_count)}
                </span>
                <span className="pt-profile-compact-stat-label">Posts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Content Grid: Sidebar + Feed ─── */}
      <div className="pt-profile-grid">

        {/* Left Sidebar */}
        <div>
          {/* Performance Card */}
          <div className="pt-profile-sidebar-card">
            <div className="pt-profile-sidebar-title">
              Performance
              <span className="pt-profile-sidebar-label">Last 30 Days</span>
            </div>

            <div className="pt-profile-progress-row">
              <div className="pt-profile-progress-header">
                <span className="pt-profile-progress-label">Win Rate</span>
                <span className="pt-profile-progress-value">68%</span>
              </div>
              <div className="pt-profile-progress-bar">
                <div className="pt-profile-progress-fill green" style={{ width: "68%" }} />
              </div>
            </div>

            <div className="pt-profile-progress-row">
              <div className="pt-profile-progress-header">
                <span className="pt-profile-progress-label">Profit Factor</span>
                <span className="pt-profile-progress-value">2.4</span>
              </div>
              <div className="pt-profile-progress-bar">
                <div className="pt-profile-progress-fill blue" style={{ width: "75%" }} />
              </div>
            </div>

            <div className="pt-profile-mini-grid">
              <div className="pt-profile-mini-stat">
                <div className="pt-profile-mini-stat-label">Avg Win</div>
                <div className="pt-profile-mini-stat-val green">+$420</div>
              </div>
              <div className="pt-profile-mini-stat">
                <div className="pt-profile-mini-stat-label">Avg Loss</div>
                <div className="pt-profile-mini-stat-val red">-$150</div>
              </div>
            </div>
          </div>

          {/* Active Challenges Card */}
          <div className="pt-profile-sidebar-card">
            <div className="pt-profile-sidebar-title">Active Challenges</div>
            <div className="pt-profile-challenge">
              <div className="pt-profile-challenge-icon">FTMO</div>
              <div className="pt-profile-challenge-info">
                <div className="pt-profile-challenge-name">100k Challenge</div>
                <div className="pt-profile-challenge-meta">Phase 1 · Day 12</div>
              </div>
              <div className="pt-profile-challenge-pnl">+4.2%</div>
            </div>
          </div>
        </div>

        {/* Right: Tabs + Posts */}
        <div>
          {/* Tabs */}
          <div className="pt-profile-tabs">
            {["Posts", "Analysis", "Journal", "Reviews"].map((tab) => (
              <button
                key={tab}
                className={`pt-profile-tab ${activeTab === tab.toLowerCase() ? "active" : ""}`}
                onClick={() => setActiveTab(tab.toLowerCase())}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Posts feed */}
          {activeTab === "posts" && (
            <>
              {postsLoading && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <Skeleton width="100%" height={120} />
                  <Skeleton width="100%" height={100} />
                </div>
              )}

              {!postsLoading && posts.length === 0 && (
                <EmptyState
                  title="No posts yet"
                  description={
                    isOwnProfile
                      ? "Share your first trade idea with the community."
                      : `${profile.display_name} hasn't posted yet.`
                  }
                />
              )}

              {posts.map((post) => (
                <a
                  key={post.id}
                  href={`/post/${post.id}`}
                  className="pt-post-link"
                  style={{ display: "block" }}
                >
                  <article className="pt-post">
                    {/* Post header */}
                    <div className="pt-post-header">
                      <div className="pt-post-author-link" onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/@${post.author?.username}`; }}>
                        <Avatar
                          src={post.author?.avatar_url}
                          name={post.author?.display_name ?? "User"}
                          size="md"
                        />
                        <div className="pt-post-author">
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span>{post.author?.display_name ?? "User"}</span>
                            {post.author?.is_verified && (
                              <IconVerified size={14} style={{ color: "var(--lime)" }} />
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="pt-post-handle">@{post.author?.username ?? "user"}</span>
                            <span className="pt-post-time">{timeAgo(post.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Post body */}
                    {post.content && (
                      <div className="pt-post-body" dir="auto">{post.content}</div>
                    )}

                    {/* Image */}
                    {post.type === "image" && post.media_urls?.[0] && (
                      <div className="pt-post-image">
                        <img
                          src={post.media_urls[0]}
                          alt="Post image"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    )}

                    {/* Action bar — matches feed exactly */}
                    <div className="pt-post-actions">
                      <button className="pt-post-action" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        <IconComment size={16} />
                        <span>{post.comment_count > 0 ? formatCompact(post.comment_count) : ""}</span>
                      </button>

                      <button className="pt-post-action" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        <IconRepost size={20} style={post.is_reposted ? { color: "var(--green)" } : undefined} />
                        <span>{post.repost_count > 0 ? formatCompact(post.repost_count) : ""}</span>
                      </button>

                      <button
                        className={`pt-post-action ${post.is_liked ? "liked" : ""}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          likeMutation.mutate({
                            postId: post.id,
                            action: post.is_liked ? "unlike" : "like",
                          });
                        }}
                      >
                        {post.is_liked ? (
                          <IconHeart size={17} style={{ color: "var(--red)" }} />
                        ) : (
                          <IconHeartOutline size={17} />
                        )}
                        <span>{post.like_count > 0 ? formatCompact(post.like_count) : ""}</span>
                      </button>

                      <div className="pt-post-action" style={{ cursor: "default" }}>
                        <IconEye size={18} />
                        <span>{post.view_count > 0 ? formatCompact(post.view_count) : ""}</span>
                      </div>

                      <button
                        className={`pt-post-action ${post.is_bookmarked ? "bookmarked" : ""}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          bookmarkMutation.mutate({
                            postId: post.id,
                            action: post.is_bookmarked ? "unbookmark" : "bookmark",
                          });
                        }}
                      >
                        <IconBookmark size={17} style={post.is_bookmarked ? { color: "var(--lime)" } : undefined} />
                      </button>

                      <button className="pt-post-action" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        <IconShare size={19} />
                      </button>
                    </div>
                  </article>
                </a>
              ))}
            </>
          )}

          {/* Placeholder for other tabs */}
          {activeTab !== "posts" && (
            <EmptyState
              title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} coming soon`}
              description="This section is under development."
            />
          )}
        </div>
      </div>
    </div>
  );
}
