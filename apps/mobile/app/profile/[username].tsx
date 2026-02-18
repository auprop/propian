import { useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fontFamily, radii, spacing, shadows } from "@/theme";
import { supabase } from "@/lib/supabase";
import {
  useProfile,
  useCurrentProfile,
  useFollow,
  useFollowStatus,
} from "@propian/shared/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { useFeed } from "@propian/shared/hooks";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Skeleton,
  ErrorState,
  EmptyState,
} from "@/components/ui";
import { IconVerified } from "@/components/icons/IconVerified";
import { IconArrow } from "@/components/icons/IconArrow";
import { IconSettings } from "@/components/icons/IconSettings";
import { IconUser } from "@/components/icons/IconUser";
import { formatCompact } from "@propian/shared/utils";
import type { Post } from "@propian/shared/types";
import { PostCard } from "@/components/feed/PostCard";
import { useLikePost, useBookmark } from "@propian/shared/hooks";

export default function ProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();

  const { user } = useAuth();
  const { data: currentProfile } = useCurrentProfile(supabase, user?.id);
  const { data: profile, isLoading, error } = useProfile(supabase, username);
  const { data: followStatus } = useFollowStatus(
    supabase,
    profile?.id ?? ""
  );
  const { follow, unfollow } = useFollow(supabase);
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
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Skeleton height={120} />
          <View style={styles.loadingProfile}>
            <Skeleton width={80} height={80} radius={40} />
            <Skeleton width={180} height={22} />
            <Skeleton width={120} height={14} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState
          message="Failed to load profile"
          onRetry={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  // Placeholder badges
  const badges = [
    { name: "Early Adopter", description: "Joined early", icon: "star", color: colors.lime },
    { name: "Top Trader", description: "Top ranked", icon: "trophy", color: "#FFD700" },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <IconArrow size={20} color={colors.black} />
        </Pressable>

        {/* Banner */}
        <LinearGradient
          colors={[colors.black, colors.g800]}
          style={styles.banner}
        >
          <View style={styles.bannerPattern} />
        </LinearGradient>

        {/* Avatar overlapping banner */}
        <View style={styles.avatarContainer}>
          <Avatar src={profile.avatar_url} name={profile.display_name} size="xl" />
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{profile.display_name}</Text>
            {profile.is_verified && (
              <IconVerified size={18} color={colors.lime} />
            )}
          </View>
          <Text style={styles.handle}>@{profile.username}</Text>

          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}

          {/* Stats */}
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

          {/* Follow / Edit Button */}
          {!isOwnProfile ? (
            <Button
              variant={isFollowing ? "ghost" : "primary"}
              fullWidth
              noIcon
              onPress={handleFollowToggle}
              disabled={follow.isPending || unfollow.isPending}
            >
              {isFollowing ? "Following" : "Follow"}
            </Button>
          ) : (
            <Button
              variant="ghost"
              fullWidth
              noIcon
              onPress={() => router.push("/(tabs)/settings")}
            >
              Edit Profile
            </Button>
          )}
        </View>

        {/* Badges */}
        {badges.length > 0 && (
          <View style={styles.badgesSection}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesScroll}
            >
              {badges.map((badge) => (
                <View key={badge.name} style={styles.badgeCard}>
                  <View
                    style={[
                      styles.badgeIcon,
                      { backgroundColor: badge.color },
                    ]}
                  >
                    <Text style={styles.badgeEmoji}>
                      {badge.icon === "star" ? "+" : badge.icon === "trophy" ? "!" : "?"}
                    </Text>
                  </View>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Trading Stats */}
        <View style={styles.tradingSection}>
          <Text style={styles.sectionTitle}>Trading Stats</Text>
          <View style={styles.tradingGrid}>
            <Card style={styles.tradingCard}>
              <Text style={styles.tradingLabel}>Style</Text>
              <Text style={styles.tradingValue}>
                {profile.trading_style
                  ? profile.trading_style.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())
                  : "Not Set"}
              </Text>
            </Card>
            <Card style={styles.tradingCard}>
              <Text style={styles.tradingLabel}>Level</Text>
              <Text style={styles.tradingValue}>
                {profile.experience_level
                  ? profile.experience_level.replace(/\b\w/g, (c) => c.toUpperCase())
                  : "Not Set"}
              </Text>
            </Card>
          </View>
        </View>

        {/* Posts section title */}
        <View style={styles.postsHeader}>
          <Text style={styles.sectionTitle}>Posts</Text>
        </View>

        {/* Placeholder for user posts */}
        <EmptyState
          icon={<IconUser size={32} color={colors.g300} />}
          title="No posts yet"
          description={
            isOwnProfile
              ? "Share your first trade idea with the community."
              : `${profile.display_name} hasn't posted yet.`
          }
        />
      </ScrollView>
    </SafeAreaView>
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
  backButton: {
    position: "absolute",
    top: 10,
    left: spacing.base,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: radii.full,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.black,
  },
  banner: {
    height: 120,
    width: "100%",
    overflow: "hidden",
  },
  bannerPattern: {
    flex: 1,
    opacity: 0.1,
  },
  avatarContainer: {
    alignItems: "center",
    marginTop: -40,
    zIndex: 5,
  },
  profileInfo: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: 10,
    gap: 6,
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
    marginTop: 6,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 0,
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
    fontSize: 12,
    color: colors.g500,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.g200,
  },
  badgesSection: {
    paddingTop: spacing.xl,
    paddingLeft: spacing.base,
  },
  sectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: colors.black,
    marginBottom: 12,
    paddingHorizontal: spacing.base,
  },
  badgesScroll: {
    gap: 10,
    paddingRight: spacing.base,
  },
  badgeCard: {
    alignItems: "center",
    width: 80,
    gap: 6,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.black,
  },
  badgeEmoji: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: colors.black,
  },
  badgeName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    color: colors.g600,
    textAlign: "center",
  },
  tradingSection: {
    paddingTop: spacing.xl,
  },
  tradingGrid: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: spacing.base,
  },
  tradingCard: {
    flex: 1,
  },
  tradingLabel: {
    fontFamily: "Outfit_500Medium",
    fontSize: 12,
    color: colors.g500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  tradingValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: colors.black,
  },
  postsHeader: {
    paddingTop: spacing.xl,
  },
});
