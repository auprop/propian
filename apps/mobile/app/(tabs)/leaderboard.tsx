import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, fontFamily, radii, spacing, shadows } from "@/theme";
import { supabase } from "@/lib/supabase";
import { useLeaderboard } from "@propian/shared/hooks";
import { Avatar, FilterChip, Card, Skeleton, EmptyState } from "@/components/ui";
import { IconChevLeft } from "@/components/icons/IconChevLeft";
import { IconTrophy } from "@/components/icons/IconTrophy";
import { IconVerified } from "@/components/icons/IconVerified";
import { IconTrendUp } from "@/components/icons/IconTrendUp";
import { formatPercent, formatCompact } from "@propian/shared/utils";
import type { LeaderboardEntry, LeaderboardPeriod } from "@propian/shared/types";

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "all_time", label: "All Time" },
];

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  const { data: entries, isLoading } = useLeaderboard(supabase, period);

  const topThree = (entries ?? []).slice(0, 3);
  const rest = (entries ?? []).slice(3);

  const renderRankRow = useCallback(
    ({ item }: { item: LeaderboardEntry }) => (
      <Card
        onPress={() => {
          if (item.user?.username) {
            router.push({ pathname: "/profile/[username]", params: { username: item.user.username } });
          }
        }}
        style={styles.rankRow}
      >
        <Text style={styles.rankNumber}>#{item.rank}</Text>
        <Avatar
          src={item.user?.avatar_url}
          name={item.user?.display_name || ""}
          size="md"
        />
        <View style={styles.rankInfo}>
          <View style={styles.rankNameRow}>
            <Text style={styles.rankName} numberOfLines={1}>
              {item.user?.display_name || "Trader"}
            </Text>
            {item.user?.is_verified && (
              <IconVerified size={12} color={colors.lime} />
            )}
          </View>
          <Text style={styles.rankHandle}>
            @{item.user?.username || "user"}
          </Text>
        </View>
        <View style={styles.rankStats}>
          <Text style={styles.roiValue}>{formatPercent(item.roi)}</Text>
          <Text style={styles.winRate}>
            {item.win_rate.toFixed(0)}% WR
          </Text>
        </View>
      </Card>
    ),
    [router]
  );

  if (isLoading) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconChevLeft size={20} color={colors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <View style={styles.periodRow}>
            {PERIODS.map((p) => (
              <Skeleton key={p.key} width={90} height={36} radius={9999} />
            ))}
          </View>
          <Skeleton height={200} />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={64} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconChevLeft size={20} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={rest}
        keyExtractor={(item) => item.user_id}
        renderItem={renderRankRow}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Period Chips */}
            <View style={styles.periodRow}>
              {PERIODS.map((p) => (
                <FilterChip
                  key={p.key}
                  label={p.label}
                  active={period === p.key}
                  onPress={() => setPeriod(p.key)}
                />
              ))}
            </View>

            {/* Podium */}
            {topThree.length > 0 && (
              <View style={styles.podium}>
                {/* Second place */}
                {topThree.length > 1 && (
                  <PodiumCard entry={topThree[1]} index={1} />
                )}
                {/* First place */}
                <PodiumCard entry={topThree[0]} index={0} />
                {/* Third place */}
                {topThree.length > 2 && (
                  <PodiumCard entry={topThree[2]} index={2} />
                )}
              </View>
            )}

            {rest.length > 0 && (
              <Text style={styles.restTitle}>Rankings</Text>
            )}
          </>
        }
        ListEmptyComponent={
          topThree.length === 0 ? (
            <EmptyState
              icon={<IconTrophy size={40} color={colors.g300} />}
              title="No rankings yet"
              description="Rankings are updated periodically."
            />
          ) : null
        }
      />
    </View>
  );
}

function PodiumCard({
  entry,
  index,
}: {
  entry: LeaderboardEntry;
  index: number;
}) {
  const router = useRouter();
  const medalColor = MEDAL_COLORS[index];
  const isFirst = index === 0;

  return (
    <View style={[styles.podiumCard, isFirst && styles.podiumCardFirst]}>
      <Card
        onPress={() => {
          if (entry.user?.username) {
            router.push({ pathname: "/profile/[username]", params: { username: entry.user.username } });
          }
        }}
        style={[styles.podiumCardInner, { borderColor: medalColor }]}
      >
        <View
          style={[styles.medalBadge, { backgroundColor: medalColor }]}
        >
          <Text style={styles.medalText}>#{entry.rank}</Text>
        </View>
        <Avatar
          src={entry.user?.avatar_url}
          name={entry.user?.display_name || ""}
          size={isFirst ? "lg" : "md"}
        />
        <Text style={styles.podiumName} numberOfLines={1}>
          {entry.user?.display_name || "Trader"}
        </Text>
        <View style={styles.podiumRoiRow}>
          <IconTrendUp size={12} color={colors.green} />
          <Text style={styles.podiumRoi}>{formatPercent(entry.roi)}</Text>
        </View>
        <Text style={styles.podiumWinRate}>
          {entry.win_rate.toFixed(0)}% Win Rate
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.g50,
  },
  listContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    padding: spacing.base,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.g200,
  },
  headerTitle: {
    fontFamily: fontFamily.sans.bold,
    fontSize: 18,
    color: colors.black,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  periodRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  podium: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
    gap: 8,
  },
  podiumCard: {
    flex: 1,
  },
  podiumCardFirst: {
    marginTop: -16,
  },
  podiumCardInner: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 2,
  },
  medalBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: colors.black,
  },
  medalText: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 11,
    color: colors.black,
  },
  podiumName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 13,
    color: colors.black,
    marginTop: 6,
    textAlign: "center",
  },
  podiumRoiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
  },
  podiumRoi: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 13,
    color: colors.green,
  },
  podiumWinRate: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: colors.g500,
    marginTop: 2,
  },
  restTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: colors.black,
    paddingHorizontal: spacing.base,
    marginBottom: 8,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: spacing.base,
    marginBottom: 8,
  },
  rankNumber: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 15,
    color: colors.g400,
    width: 32,
    textAlign: "center",
  },
  rankInfo: {
    flex: 1,
  },
  rankNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rankName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: colors.black,
  },
  rankHandle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: colors.g500,
  },
  rankStats: {
    alignItems: "flex-end",
  },
  roiValue: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 14,
    color: colors.green,
  },
  winRate: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: colors.g500,
  },
});
