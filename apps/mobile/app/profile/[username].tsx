import { useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fontFamily, radii, spacing, shadows } from "@/theme";
import { supabase } from "@/lib/supabase";
import {
  useProfile,
  useCurrentProfile,
  useFollow,
  useFollowStatus,
  useUserPosts,
  useLikePost,
  useBookmark,
} from "@propian/shared/hooks";
import { useAuth } from "@/providers/AuthProvider";
import {
  Avatar,
  Badge,
  Button,
  Skeleton,
  ErrorState,
  EmptyState,
} from "@/components/ui";
import { IconVerified } from "@/components/icons/IconVerified";
import { IconChevLeft } from "@/components/icons/IconChevLeft";
import { IconEdit } from "@/components/icons/IconEdit";
import { IconUser } from "@/components/icons/IconUser";
import { formatCompact, isRTLText } from "@propian/shared/utils";
import type { Post } from "@propian/shared/types";
import { PostCard } from "@/components/feed/PostCard";

export default function ProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { user } = useAuth();
  const { data: currentProfile } = useCurrentProfile(supabase, user?.id);
  const { data: profile, isLoading, error } = useProfile(supabase, username);
  const { data: followStatus } = useFollowStatus(
    supabase,
    profile?.id ?? ""
  );
  const { follow, unfollow } = useFollow(supabase);

  const { data: postsData, isLoading: postsLoading } = useUserPosts(supabase, profile?.id);
  const posts = useMemo(
    () => postsData?.pages.flatMap((p) => p.data) ?? [],
    [postsData]
  );

  const likeMutation = useLikePost(supabase);
  const bookmarkMutation = useBookmark(supabase);

  const isOwnProfile = currentProfile?.username === username;
  const isFollowing = followStatus === "following";

  const handleFollowToggle = () => {
    if (!profile) return;
    if (isFollowing) {
      unfollow.mutate(profile.id);
    } else {
      follow.mutate(profile.id);
    }
  };

  const handleLike = useCallback(
    (postId: string, action: "like" | "unlike") => {
      likeMutation.mutate({ postId, action });
    },
    [likeMutation]
  );

  const handleBookmark = useCallback(
    (postId: string, action: "bookmark" | "unbookmark") => {
      bookmarkMutation.mutate({ postId, action });
    },
    [bookmarkMutation]
  );

  if (isLoading) {
    return (
      <View style={styles.safe}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <Skeleton height={120} />
          <View style={styles.loadingProfile}>
            <Skeleton width={80} height={80} radius={40} />
            <Skeleton width={180} height={22} />
            <Skeleton width={120} height={14} />
          </View>
        </View>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <ErrorState
          message="Failed to load profile"
          onRetry={() => router.back()}
        />
      </View>
    );
  }

  // Placeholder badges
  const badges = [
    { name: "Early Adopter", color: colors.lime },
    { name: "Top Trader", color: "#FFD700" },
  ];

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconChevLeft size={20} color={colors.black} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        {isOwnProfile ? (
          <Pressable onPress={() => router.push("/edit-profile" as any)} style={styles.headerAction}>
            <Text style={styles.headerActionText}>Edit</Text>
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ─── Profile Card ─── */}
        <View style={styles.card}>
          {/* Banner */}
          <LinearGradient
            colors={[colors.black, colors.g800]}
            style={styles.banner}
          />

          {/* Avatar overlapping banner */}
          <View style={styles.avatarContainer}>
            <Avatar src={profile.avatar_url} name={profile.display_name} size="xl" />
          </View>

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName}>{profile.display_name}</Text>
              {profile.is_verified && (
                <IconVerified size={18} />
              )}
            </View>
            <Text style={styles.handle}>@{profile.username}</Text>

            {profile.bio && (
              <Text style={[styles.bio, isRTLText(profile.bio) && { textAlign: "right" }]}>
                {profile.bio}
              </Text>
            )}

            {/* Trading style + experience as badges */}
            {(profile.trading_style || profile.experience_level) && (
              <View style={styles.tagsRow}>
                {profile.trading_style && (
                  <Badge variant="lime">
                    {profile.trading_style.replace("-", " ")}
                  </Badge>
                )}
                {profile.experience_level && (
                  <Badge>{profile.experience_level}</Badge>
                )}
              </View>
            )}

            {/* Stats row — inside card */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {formatCompact(profile.follower_count)}
                </Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {formatCompact(profile.following_count)}
                </Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {formatCompact(profile.post_count)}
                </Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
            </View>

            {/* Follow Button — other profiles only */}
            {!isOwnProfile && (
              <Button
                variant={isFollowing ? "ghost" : "primary"}
                fullWidth
                noIcon
                onPress={handleFollowToggle}
                disabled={follow.isPending || unfollow.isPending}
              >
                {isFollowing ? "Following" : "Follow"}
              </Button>
            )}
          </View>

          {/* Badges row — inside card */}
          {badges.length > 0 && (
            <View style={styles.badgesRow}>
              {badges.map((badge) => (
                <View key={badge.name} style={styles.badgeChip}>
                  <View style={[styles.badgeDot, { backgroundColor: badge.color }]} />
                  <Text style={styles.badgeChipText}>{badge.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ─── User Posts ─── */}
        <View style={styles.postsSection}>
          {postsLoading && (
            <View style={{ gap: 12 }}>
              <Skeleton height={80} />
              <Skeleton height={80} />
            </View>
          )}

          {!postsLoading && posts.length === 0 && (
            <EmptyState
              icon={<IconUser size={32} color={colors.g300} />}
              title="No posts yet"
              description={
                isOwnProfile
                  ? "Share your first trade idea with the community."
                  : `${profile.display_name} hasn't posted yet.`
              }
            />
          )}

          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onBookmark={handleBookmark}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.g50,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    gap: 16,
  },
  loadingProfile: {
    alignItems: "center",
    gap: 10,
    marginTop: -40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.g200,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fontFamily.sans.bold,
    color: colors.black,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAction: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActionText: {
    fontFamily: fontFamily.sans.semibold,
    fontSize: 14,
    color: colors.g600,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    overflow: "hidden",
    marginHorizontal: spacing.base,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.g200,
    ...shadows.sm,
  },
  banner: {
    height: 100,
    width: "100%",
  },
  avatarContainer: {
    alignItems: "center",
    marginTop: -40,
    zIndex: 5,
  },
  profileInfo: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  displayName: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 22,
    color: colors.black,
    letterSpacing: -0.5,
  },
  handle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g500,
  },
  bio: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g600,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 4,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 12,
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  statValue: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 18,
    color: colors.black,
  },
  statLabel: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: colors.g500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.g200,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.g200,
  },
  badgeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.g50,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeChipText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: colors.g700,
  },
  postsSection: {
    marginTop: 16,
    paddingHorizontal: spacing.base,
    gap: 12,
  },
});
