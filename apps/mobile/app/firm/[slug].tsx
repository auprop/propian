import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, fontFamily, radii, spacing, shadows } from "@/theme";
import { supabase } from "@/lib/supabase";
import {
  useFirm,
  useFirmReviews,
  useCreateReview,
  useVoteReview,
} from "@propian/shared/hooks";
import {
  Avatar,
  Badge,
  Button,
  Card,
  RatingStars,
  EmptyState,
  Skeleton,
  ErrorState,
} from "@/components/ui";
import { IconVerifiedFirm } from "@/components/icons/IconVerifiedFirm";
import { IconStar } from "@/components/icons/IconStar";
import { IconThumbUp } from "@/components/icons/IconThumbUp";
import { IconChevLeft } from "@/components/icons/IconChevLeft";
import { IconGlobe } from "@/components/icons/IconGlobe";
import { formatCurrency } from "@propian/shared/utils";
import { timeAgo } from "@propian/shared/utils";
import type { FirmReview } from "@propian/shared/types";

type Tab = "overview" | "reviews" | "rules" | "analytics";

export default function FirmDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { data: firm, isLoading, error } = useFirm(supabase, slug);
  const {
    data: reviews,
    isLoading: reviewsLoading,
  } = useFirmReviews(supabase, firm?.id ?? "", "recent");
  const voteMutation = useVoteReview(supabase);

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "reviews", label: "Reviews" },
    { key: "rules", label: "Rules" },
    { key: "analytics", label: "Analytics" },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Skeleton width={80} height={80} radius={40} />
          <Skeleton width={200} height={24} />
          <Skeleton width={150} height={16} />
          <Skeleton height={200} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !firm) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState
          message="Failed to load firm details"
          onRetry={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <IconChevLeft size={20} color={colors.black} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        {/* Hero */}
        <View style={styles.hero}>
          <Avatar src={firm.logo_url} name={firm.name} size="xl" />
          <View style={styles.heroNameRow}>
            <Text style={styles.heroName}>{firm.name}</Text>
            {firm.is_active && <IconVerifiedFirm size={18} />}
          </View>
          <RatingStars rating={firm.rating_avg} size={18} />
          <Text style={styles.heroReviews}>
            {firm.review_count} review{firm.review_count !== 1 ? "s" : ""}
          </Text>
          {firm.description && (
            <Text style={styles.heroDescription}>{firm.description}</Text>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Stats</Text>
            <View style={styles.statsGrid}>
              <StatItem label="Profit Split" value={firm.profit_split || "N/A"} />
              <StatItem label="Max Drawdown" value={firm.max_drawdown || "N/A"} />
              <StatItem
                label="Challenge Fee"
                value={
                  firm.challenge_fee_min
                    ? `From ${formatCurrency(firm.challenge_fee_min)}`
                    : "N/A"
                }
              />
              <StatItem label="Pass Rate" value={firm.pass_rate || "N/A"} />
              <StatItem label="Payout Cycle" value={firm.payout_cycle || "N/A"} />
              <StatItem label="Total Payouts" value={firm.total_payouts || "N/A"} />
            </View>

            {firm.platforms.length > 0 && (
              <View style={styles.platformSection}>
                <Text style={styles.sectionTitle}>Platforms</Text>
                <View style={styles.platformRow}>
                  {firm.platforms.map((p) => (
                    <Badge key={p} variant="gray">
                      {p}
                    </Badge>
                  ))}
                </View>
              </View>
            )}

            {firm.website && (
              <View style={styles.websiteRow}>
                <IconGlobe size={16} color={colors.g500} />
                <Text style={styles.websiteText}>{firm.website}</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === "reviews" && (
          <View style={styles.section}>
            {reviewsLoading ? (
              <View style={styles.reviewLoading}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} height={100} />
                ))}
              </View>
            ) : (reviews ?? []).length === 0 ? (
              <EmptyState
                icon={<IconStar size={32} color={colors.g300} />}
                title="No reviews yet"
                description="Be the first to review this firm."
              />
            ) : (
              (reviews ?? []).map((review: FirmReview) => (
                <Card key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAuthor}>
                      <Avatar
                        src={review.author?.avatar_url}
                        name={
                          review.is_anonymous
                            ? "Anonymous"
                            : review.author?.display_name || ""
                        }
                        size="sm"
                      />
                      <View>
                        <Text style={styles.reviewAuthorName}>
                          {review.is_anonymous
                            ? "Anonymous"
                            : review.author?.display_name || "User"}
                        </Text>
                        <Text style={styles.reviewDate}>
                          {timeAgo(review.created_at)}
                        </Text>
                      </View>
                    </View>
                    <RatingStars rating={review.rating} size={12} />
                  </View>
                  <Text style={styles.reviewTitle}>{review.title}</Text>
                  <Text style={styles.reviewBody}>{review.body}</Text>

                  {review.tags.length > 0 && (
                    <View style={styles.tagRow}>
                      {review.tags.map((tag) => (
                        <Badge key={tag} variant="lime">
                          {tag}
                        </Badge>
                      ))}
                    </View>
                  )}

                  <Pressable
                    style={styles.helpfulButton}
                    onPress={() => voteMutation.mutate(review.id)}
                  >
                    <IconThumbUp size={14} color={colors.g500} />
                    <Text style={styles.helpfulText}>
                      Helpful ({review.helpful_count})
                    </Text>
                  </Pressable>
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === "rules" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trading Rules</Text>
            <Card>
              <RuleItem
                label="Maximum Drawdown"
                value={firm.max_drawdown || "N/A"}
              />
              <RuleItem
                label="Daily Drawdown"
                value={firm.daily_drawdown || "N/A"}
              />
              <RuleItem
                label="Payout Cycle"
                value={firm.payout_cycle || "N/A"}
              />
              <RuleItem
                label="Scaling Plan"
                value={firm.scaling_plan ? "Available" : "Not Available"}
              />
              <RuleItem
                label="Profit Split"
                value={firm.profit_split || "N/A"}
              />
            </Card>
          </View>
        )}

        {activeTab === "analytics" && (
          <View style={styles.section}>
            <EmptyState
              icon={<IconStar size={32} color={colors.g300} />}
              title="Analytics Coming Soon"
              description="Detailed analytics and comparisons will be available here."
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function RuleItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.ruleItem}>
      <Text style={styles.ruleLabel}>{label}</Text>
      <Text style={styles.ruleValue}>{value}</Text>
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
    padding: spacing.xl,
    alignItems: "center",
    gap: 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  backText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: colors.black,
  },
  hero: {
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  heroNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    marginBottom: 8,
  },
  heroName: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 24,
    color: colors.black,
    letterSpacing: -0.5,
  },
  heroReviews: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g500,
    marginTop: 4,
  },
  heroDescription: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g600,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20,
    paddingHorizontal: spacing.xl,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.base,
    borderBottomWidth: 2,
    borderBottomColor: colors.g200,
    marginBottom: spacing.base,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.lime,
  },
  tabText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: colors.g500,
  },
  tabTextActive: {
    color: colors.black,
  },
  section: {
    paddingHorizontal: spacing.base,
  },
  sectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: colors.black,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statItem: {
    width: "47%",
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.md,
    padding: 14,
    ...shadows.sm,
  },
  statLabel: {
    fontFamily: "Outfit_500Medium",
    fontSize: 12,
    color: colors.g500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: colors.black,
  },
  platformSection: {
    marginTop: 20,
  },
  platformRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  websiteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  websiteText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g500,
  },
  reviewLoading: {
    gap: 12,
  },
  reviewCard: {
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  reviewAuthor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reviewAuthorName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: colors.black,
  },
  reviewDate: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: colors.g400,
  },
  reviewTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
    color: colors.black,
    marginBottom: 4,
  },
  reviewBody: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g600,
    lineHeight: 20,
    marginBottom: 10,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  helpfulButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
  },
  helpfulText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: colors.g500,
  },
  ruleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  ruleLabel: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: colors.g600,
  },
  ruleValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: colors.black,
  },
});
