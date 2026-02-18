import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Share,
  Dimensions,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  useReferralProfile,
  useUserReferrals,
  useReferralLeaderboard,
} from "@propian/shared/hooks";
import type { ReferralTier, ReferralTierMeta } from "@propian/shared/types";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { IconArrow } from "@/components/icons/IconArrow";
import { colors, fontFamily, radii } from "@/theme";
import { supabase } from "@/lib/supabase";

const SCREEN_W = Dimensions.get("window").width;

/* ─── Constants ─── */

type Tab = "dashboard" | "leaderboard" | "rewards" | "invite-card";
const TABS: { key: Tab; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "leaderboard", label: "Leaderboard" },
  { key: "rewards", label: "Rewards" },
  { key: "invite-card", label: "Invite Card" },
];

const TIER_META: ReferralTierMeta[] = [
  { key: "bronze", name: "Bronze", icon: "🥉", minReferrals: 1, rewardPct: 10, rewards: ["7 days Pro per referral", "Bronze profile badge", "Access to dashboard"] },
  { key: "silver", name: "Silver", icon: "🥈", minReferrals: 10, rewardPct: 15, rewards: ["7 days Pro per referral", "Silver badge", "Priority support", "$10 credit/referral"] },
  { key: "gold", name: "Gold", icon: "🥇", minReferrals: 50, rewardPct: 20, rewards: ["14 days Pro per referral", "Gold badge", "VIP support", "$15 credit/referral"] },
  { key: "diamond", name: "Diamond", icon: "💎", minReferrals: 100, rewardPct: 25, rewards: ["Lifetime Pro", "Diamond badge", "Account manager", "$20 credit/referral"] },
];

function tierColor(tier: ReferralTier): string {
  switch (tier) {
    case "diamond": return "#b9f2ff";
    case "gold": return "#FFD700";
    case "silver": return "#C0C0C0";
    default: return "#cd7f32";
  }
}

function statusStyle(status: string): { bg: string; fg: string } {
  switch (status) {
    case "active": return { bg: "#dcfce7", fg: "#15803d" };
    case "pending": return { bg: "#fef3c7", fg: "#b45309" };
    default: return { bg: colors.g100, fg: colors.g500 };
  }
}

/* ─── Main Screen ─── */

export default function ReferralsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [refreshing, setRefreshing] = useState(false);

  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useReferralProfile(supabase);
  const { data: referrals, isLoading: referralsLoading, refetch: refetchReferrals } = useUserReferrals(supabase);
  const { data: leaderboard, isLoading: lbLoading, refetch: refetchLb } = useReferralLeaderboard(supabase);

  const referralLink = profile ? `https://propian.app/join?ref=${profile.referral_code}` : "";
  const currentTierMeta = TIER_META.find((t) => t.key === profile?.tier) ?? TIER_META[0];
  const nextTierMeta = TIER_META[TIER_META.indexOf(currentTierMeta) + 1] ?? null;
  const proDaysEarned = (profile?.total_referrals ?? 0) * 7;
  const userRank = leaderboard?.findIndex((e) => e.user_id === profile?.user_id);
  const rankDisplay = userRank !== undefined && userRank >= 0 ? `#${userRank + 1}` : "—";
  const totalRefs = profile?.total_referrals ?? 0;
  const progressPct = nextTierMeta
    ? Math.min(100, ((totalRefs - currentTierMeta.minReferrals) / (nextTierMeta.minReferrals - currentTierMeta.minReferrals)) * 100)
    : 100;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchReferrals(), refetchLb()]);
    setRefreshing(false);
  }, [refetchProfile, refetchReferrals, refetchLb]);

  async function shareInvite() {
    try {
      await Share.share({
        message: `Join me on Propian! Use my referral code ${profile?.referral_code ?? ""} to get 7 days of Pro free 🚀 ${referralLink}`,
      });
    } catch (_) { /* user cancelled */ }
  }

  async function shareCode() {
    try {
      await Share.share({ message: profile?.referral_code ?? "" });
    } catch (_) { /* user cancelled */ }
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <IconArrow size={20} color={colors.g900} />
          </View>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Referrals</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll} contentContainerStyle={s.tabScrollContent}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[s.tabBtn, tab === t.key && s.tabBtnActive]} onPress={() => setTab(t.key)}>
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {profileLoading ? (
          <View style={{ gap: 12 }}>
            <Skeleton width={SCREEN_W - 32} height={200} radius={16} />
            <Skeleton width={SCREEN_W - 32} height={100} radius={12} />
          </View>
        ) : (
          <>
            {tab === "dashboard" && (
              <DashboardContent
                profile={profile} referralLink={referralLink} shareInvite={shareInvite} shareCode={shareCode}
                proDaysEarned={proDaysEarned} rankDisplay={rankDisplay} currentTierMeta={currentTierMeta}
                nextTierMeta={nextTierMeta} progressPct={progressPct} totalRefs={totalRefs}
                referrals={referrals ?? []} referralsLoading={referralsLoading} setTab={setTab}
              />
            )}
            {tab === "leaderboard" && (
              <LeaderboardContent entries={leaderboard ?? []} isLoading={lbLoading} currentUserId={profile?.user_id} />
            )}
            {tab === "rewards" && (
              <RewardsContent
                currentTier={profile?.tier ?? "bronze"} totalReferrals={totalRefs}
                proDaysEarned={proDaysEarned} totalEarnings={profile?.total_earnings ?? 0}
                referrals={referrals ?? []}
              />
            )}
            {tab === "invite-card" && (
              <InviteCardContent referralCode={profile?.referral_code ?? "--------"} />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════════ */

function DashboardContent({
  profile, referralLink, shareInvite, shareCode, proDaysEarned, rankDisplay,
  currentTierMeta, nextTierMeta, progressPct, totalRefs, referrals, referralsLoading, setTab,
}: {
  profile: any; referralLink: string; shareInvite: () => void; shareCode: () => void;
  proDaysEarned: number; rankDisplay: string; currentTierMeta: ReferralTierMeta; nextTierMeta: ReferralTierMeta | null;
  progressPct: number; totalRefs: number; referrals: any[]; referralsLoading: boolean; setTab: (t: Tab) => void;
}) {
  return (
    <>
      {/* Invite Card */}
      <View style={s.inviteCard}>
        <Text style={s.inviteLabel}>YOUR REFERRAL CODE</Text>
        <View style={s.codeRow}>
          <Text style={s.codeText}>{profile?.referral_code ?? "--------"}</Text>
          <TouchableOpacity style={s.copyBtn} onPress={shareCode}>
            <Text style={s.copyBtnText}>📋 Copy</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={s.linkRow} onPress={shareInvite}>
          <Text style={s.linkText} numberOfLines={1}>{referralLink || "---"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.shareBtn} onPress={shareInvite}>
          <Text style={s.shareBtnText}>📤 Share Invite Link</Text>
        </TouchableOpacity>
        {/* Benefit callout */}
        <View style={s.benefitBox}>
          <Text style={{ fontSize: 18 }}>🎁</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.benefitTitle}>Both you and your friend get 7 days of Pro free</Text>
            <Text style={s.benefitSub}>when they sign up and complete their profile</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: colors.lime }]}>{totalRefs}</Text>
          <Text style={s.statLabel}>Referrals</Text>
          <Text style={[s.statSub, { color: "#22c55e" }]}>+{Math.min(totalRefs, 6)} this month</Text>
        </View>
        <View style={[s.statBox, s.statBorderX]}>
          <Text style={[s.statVal, { color: "#22c55e" }]}>{proDaysEarned}</Text>
          <Text style={s.statLabel}>Pro Days</Text>
          <Text style={[s.statSub, { color: colors.g400 }]}>7 days/referral</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statVal}>{rankDisplay}</Text>
          <Text style={s.statLabel}>Rank</Text>
          <Text style={[s.statSub, { color: "#f59e0b" }]}>Top 5%</Text>
        </View>
      </View>

      {/* Progress to next tier */}
      <View style={s.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontFamily: fontFamily.sans.semibold, color: colors.g900 }}>
            🔥 Progress to {nextTierMeta?.name ?? "Max"} Tier
          </Text>
          <Text style={{ fontSize: 11, fontFamily: fontFamily.mono.regular, color: colors.g500 }}>
            {totalRefs} / {nextTierMeta?.minReferrals ?? totalRefs}
          </Text>
        </View>
        <View style={{ height: 10, backgroundColor: colors.g100, borderRadius: 5, overflow: "hidden" }}>
          <View style={{ height: "100%", width: `${progressPct}%`, borderRadius: 5, backgroundColor: colors.lime }} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
          <Text style={{ fontSize: 10, fontFamily: fontFamily.sans.regular, color: colors.g400 }}>
            {currentTierMeta.icon} {currentTierMeta.name}
          </Text>
          {nextTierMeta && (
            <Text style={{ fontSize: 10, fontFamily: fontFamily.sans.regular, color: colors.g400 }}>
              {nextTierMeta.icon} {nextTierMeta.name}
            </Text>
          )}
        </View>
      </View>

      {/* Quick actions */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <TouchableOpacity style={[s.card, { flex: 1, alignItems: "center" }]} onPress={() => setTab("invite-card")}>
          <Text style={{ fontSize: 22, marginBottom: 4 }}>🎨</Text>
          <Text style={{ fontFamily: fontFamily.sans.semibold, fontSize: 12, color: colors.g900 }}>Invite Card</Text>
          <Text style={{ fontSize: 10, color: colors.g400 }}>Share branded card</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.card, { flex: 1, alignItems: "center" }]} onPress={() => setTab("leaderboard")}>
          <Text style={{ fontSize: 22, marginBottom: 4 }}>🏆</Text>
          <Text style={{ fontFamily: fontFamily.sans.semibold, fontSize: 12, color: colors.g900 }}>Leaderboard</Text>
          <Text style={{ fontSize: 10, color: colors.g400 }}>Ranked {rankDisplay}</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Referrals */}
      <Text style={s.sectionLabel}>Recent Referrals</Text>
      {referralsLoading ? (
        <View style={{ gap: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} width={SCREEN_W - 32} height={56} radius={12} />)}
        </View>
      ) : !referrals.length ? (
        <View style={s.emptyCard}>
          <Text style={{ fontSize: 32, marginBottom: 6 }}>👥</Text>
          <Text style={s.emptyTitle}>No referrals yet</Text>
          <Text style={s.emptyDesc}>Share your code to start earning Pro days.</Text>
        </View>
      ) : (
        <View style={s.card}>
          {referrals.map((ref, i) => {
            const sc = statusStyle(ref.status);
            return (
              <View key={ref.id} style={[s.refRow, i < referrals.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.g100 }]}>
                <Avatar src={ref.referred_user?.avatar_url} name={ref.referred_user?.display_name ?? "User"} size="sm" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.refName}>{ref.referred_user?.display_name ?? "Unknown"}</Text>
                  <Text style={s.refDate}>
                    {new Date(ref.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <View style={[s.statusPill, { backgroundColor: sc.bg }]}>
                    <Text style={[s.statusText, { color: sc.fg }]}>{ref.status}</Text>
                  </View>
                  <Text style={[s.refReward, { color: ref.status === "active" ? "#22c55e" : colors.g400 }]}>
                    {ref.status === "active" ? "+7 days Pro" : "Pending"}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Monthly chart */}
      <Text style={s.sectionLabel}>Monthly Referrals</Text>
      <View style={s.card}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", height: 100, gap: 4 }}>
          {[
            { m: "Sep", v: 2 }, { m: "Oct", v: 3 }, { m: "Nov", v: 4 },
            { m: "Dec", v: 5 }, { m: "Jan", v: 4 }, { m: "Feb", v: 6 },
          ].map((d) => (
            <View key={d.m} style={{ flex: 1, alignItems: "center", gap: 3 }}>
              <Text style={{ fontSize: 10, fontFamily: fontFamily.mono.regular, color: d.m === "Feb" ? colors.lime : colors.g500 }}>{d.v}</Text>
              <View style={{ width: "80%", height: `${(d.v / 6) * 100}%`, minHeight: 6, backgroundColor: d.m === "Feb" ? colors.lime : colors.g200, borderRadius: 3 }} />
              <Text style={{ fontSize: 9, color: colors.g400 }}>{d.m}</Text>
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LEADERBOARD
   ═══════════════════════════════════════════════════════════════ */

function LeaderboardContent({ entries, isLoading, currentUserId }: { entries: any[]; isLoading: boolean; currentUserId?: string }) {
  const [filter, setFilter] = useState(0);

  if (isLoading) {
    return <View style={{ gap: 10 }}>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} width={SCREEN_W - 32} height={60} radius={12} />)}</View>;
  }

  if (!entries.length) {
    return (
      <View style={s.emptyCard}>
        <Text style={{ fontSize: 32, marginBottom: 6 }}>🏆</Text>
        <Text style={s.emptyTitle}>No leaders yet</Text>
        <Text style={s.emptyDesc}>Be the first to climb the leaderboard!</Text>
      </View>
    );
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <>
      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {["All Time", "This Month", "This Week"].map((f, i) => (
          <TouchableOpacity key={f} style={[s.filterChip, filter === i && s.filterChipActive]} onPress={() => setFilter(i)}>
            <Text style={[s.filterChipText, filter === i && s.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Top 3 podium */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {[top3[1], top3[0], top3[2]].filter(Boolean).map((p) => {
          const isFirst = p.rank === 1;
          return (
            <View key={p.user_id} style={[s.podiumCard, isFirst && s.podiumCardFirst]}>
              <Text style={{ fontSize: 32, marginBottom: 6 }}>{p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : "🥉"}</Text>
              <Avatar src={p.user?.avatar_url} name={p.user?.display_name ?? "Trader"} size="lg" />
              <Text style={s.podiumName}>{p.user?.display_name ?? "Unknown"}</Text>
              <Text style={s.podiumCount}>{p.total_referrals}</Text>
              <Text style={{ fontSize: 10, color: colors.g400 }}>referrals</Text>
              <View style={s.podiumReward}>
                <Text style={s.podiumRewardText}>${p.total_earnings.toFixed(0)} credit</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Full table */}
      {rest.length > 0 && (
        <View style={s.card}>
          {rest.map((r, i) => {
            const isMe = r.user_id === currentUserId;
            return (
              <View key={r.user_id} style={[s.lbRow, isMe && s.lbRowMe, i < rest.length - 1 && !isMe && { borderBottomWidth: 1, borderBottomColor: colors.g100 }]}>
                <Text style={s.lbRank}>{r.rank}</Text>
                <Avatar src={r.user?.avatar_url} name={r.user?.display_name ?? "Trader"} size="sm" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={s.lbName} numberOfLines={1}>{r.user?.display_name ?? "Unknown"}</Text>
                    {isMe && <View style={s.youBadge}><Text style={s.youBadgeText}>YOU</Text></View>}
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", gap: 2 }}>
                  <Text style={s.lbCount}>{r.total_referrals}</Text>
                  <Text style={s.lbEarned}>${r.total_earnings.toFixed(0)}</Text>
                </View>
                <View style={[s.lbTierPill, { backgroundColor: `${tierColor(r.tier)}30` }]}>
                  <Text style={{ fontSize: 14 }}>{TIER_META.find((t) => t.key === r.tier)?.icon}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   REWARDS
   ═══════════════════════════════════════════════════════════════ */

function RewardsContent({ currentTier, totalReferrals, proDaysEarned, totalEarnings, referrals }: {
  currentTier: ReferralTier; totalReferrals: number; proDaysEarned: number; totalEarnings: number; referrals: any[];
}) {
  const tierReqs: Record<ReferralTier, string> = { bronze: "1–9 refs", silver: "10–49 refs", gold: "50–99 refs", diamond: "100+ refs" };

  const rewardHistory = referrals.slice(0, 6).map((ref) => ({
    reward: ref.status === "active" ? "+7 days Pro" : "Pending",
    icon: ref.status === "active" ? "⏱" : "⏳",
    from: ref.referred_user?.display_name ?? "User",
    date: new Date(ref.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    applied: ref.status === "active",
  }));

  return (
    <>
      {/* Tier Grid */}
      <Text style={s.sectionLabel}>Referral Tiers</Text>
      <View style={s.tierGrid}>
        {TIER_META.map((tier) => {
          const isCurrent = tier.key === currentTier;
          return (
            <View key={tier.key} style={[s.tierCard, isCurrent && { borderColor: colors.lime, borderWidth: 2 }]}>
              {isCurrent && <View style={s.tierBadge}><Text style={s.tierBadgeText}>Current</Text></View>}
              <Text style={s.tierIcon}>{tier.icon}</Text>
              <Text style={s.tierName}>{tier.name}</Text>
              <Text style={s.tierReq}>{tierReqs[tier.key]}</Text>
              {tier.rewards.map((r) => <Text key={r} style={s.tierReward}>✓ {r}</Text>)}
            </View>
          );
        })}
      </View>

      {/* Reward History */}
      <Text style={s.sectionLabel}>Reward History</Text>
      {rewardHistory.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={{ fontSize: 32, marginBottom: 6 }}>🎁</Text>
          <Text style={s.emptyTitle}>No rewards yet</Text>
          <Text style={s.emptyDesc}>Start referring to earn rewards.</Text>
        </View>
      ) : (
        <View style={s.card}>
          {rewardHistory.map((r, i) => (
            <View key={i} style={[s.rewardRow, i < rewardHistory.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.g100 }]}>
              <Text style={{ fontSize: 16 }}>{r.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fontFamily.sans.semibold, fontSize: 13, color: colors.g900 }}>{r.reward}</Text>
                <Text style={{ fontSize: 11, fontFamily: fontFamily.sans.regular, color: colors.g400 }}>{r.from} • {r.date}</Text>
              </View>
              <View style={[s.statusPill, { backgroundColor: r.applied ? "#dcfce7" : "#fef3c7" }]}>
                <Text style={[s.statusText, { color: r.applied ? "#15803d" : "#b45309" }]}>{r.applied ? "Applied" : "Pending"}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Active Benefits */}
      <Text style={s.sectionLabel}>Your Active Benefits</Text>
      <View style={{ gap: 10 }}>
        {[
          { icon: "⏱", title: `${proDaysEarned} Pro Days`, desc: `From ${totalReferrals} referrals`, color: colors.lime },
          { icon: "💰", title: `$${totalEarnings.toFixed(0)} Credit`, desc: "For challenges & courses", color: "#22c55e" },
          { icon: TIER_META.find((t) => t.key === currentTier)?.icon ?? "🥉", title: `${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Badge`, desc: "On your profile", color: tierColor(currentTier) },
        ].map((b) => (
          <View key={b.title} style={[s.card, { alignItems: "center" }]}>
            <Text style={{ fontSize: 28, marginBottom: 6 }}>{b.icon}</Text>
            <Text style={{ fontFamily: fontFamily.sans.bold, fontSize: 14, color: colors.g900, marginBottom: 2 }}>{b.title}</Text>
            <Text style={{ fontSize: 11, fontFamily: fontFamily.sans.regular, color: colors.g400, marginBottom: 10 }}>{b.desc}</Text>
            <View style={{ width: "100%", height: 5, backgroundColor: colors.g100, borderRadius: 3, overflow: "hidden" }}>
              <View style={{ height: "100%", width: "100%", backgroundColor: b.color, borderRadius: 3 }} />
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INVITE CARD
   ═══════════════════════════════════════════════════════════════ */

function InviteCardContent({ referralCode }: { referralCode: string }) {
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState(0);

  const themes = [
    { name: "Dark", bg: "#0a0a0a" },
    { name: "Lime", bg: "#0a1a0a" },
    { name: "Blue", bg: "#0a0a2e" },
    { name: "Warm", bg: "#1a0a0a" },
  ];
  const formats = ["Square", "Story", "Banner"];

  return (
    <>
      {/* Preview */}
      <Text style={s.sectionLabel}>Card Preview</Text>
      <View style={s.previewOuter}>
        <View style={s.previewInner}>
          <Text style={{ fontSize: 10, color: colors.g500, letterSpacing: 2, marginBottom: 6 }}>YOU'VE BEEN INVITED TO</Text>
          <Text style={{ fontSize: 26, fontFamily: fontFamily.sans.extrabold, color: colors.white, marginBottom: 4 }}>
            Prop<Text style={{ color: colors.lime }}>ian</Text>
          </Text>
          <Text style={{ fontSize: 11, fontFamily: fontFamily.sans.regular, color: colors.g400, textAlign: "center", marginBottom: 18 }}>
            The social network for prop traders.
          </Text>
          {/* Stats row */}
          <View style={{ flexDirection: "row", gap: 20, marginBottom: 18 }}>
            {[{ v: "12K+", l: "Traders" }, { v: "45", l: "Firms" }, { v: "98K+", l: "Reviews" }].map((st) => (
              <View key={st.l} style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 16, fontFamily: fontFamily.mono.medium, fontWeight: "800", color: colors.lime }}>{st.v}</Text>
                <Text style={{ fontSize: 8, color: colors.g500 }}>{st.l}</Text>
              </View>
            ))}
          </View>
          {/* Code */}
          <View style={{ backgroundColor: colors.g800, borderRadius: radii.md, padding: 12, alignItems: "center" }}>
            <Text style={{ fontSize: 9, color: colors.g500, marginBottom: 3 }}>USE CODE</Text>
            <Text style={{ fontSize: 18, fontFamily: fontFamily.mono.medium, fontWeight: "800", color: colors.lime, letterSpacing: 3 }}>{referralCode}</Text>
          </View>
          <Text style={{ marginTop: 12, fontSize: 10, color: colors.lime }}>🎁 Get 7 days of Pro free</Text>
        </View>
        <Text style={{ padding: 10, textAlign: "center", fontSize: 10, fontFamily: fontFamily.sans.regular, color: colors.g400, backgroundColor: colors.white }}>
          What your friends will see
        </Text>
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.lime, flex: 1 }]}>
          <Text style={[s.actionBtnText, { color: colors.black }]}>📥 Download</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.g900, flex: 1 }]}>
          <Text style={[s.actionBtnText, { color: colors.white }]}>📤 Share</Text>
        </TouchableOpacity>
      </View>

      {/* Customize */}
      <Text style={s.sectionLabel}>Customize</Text>

      {/* Theme */}
      <View style={s.card}>
        <Text style={{ fontFamily: fontFamily.sans.semibold, fontSize: 13, color: colors.g900, marginBottom: 10 }}>🎨 Background Theme</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {themes.map((t, i) => (
            <TouchableOpacity key={t.name} style={[s.themeBox, { backgroundColor: t.bg }, selectedTheme === i && { borderColor: colors.lime, borderWidth: 2 }]} onPress={() => setSelectedTheme(i)}>
              <Text style={{ fontSize: 10, fontFamily: fontFamily.sans.semibold, color: colors.white }}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Message */}
      <View style={s.card}>
        <Text style={{ fontFamily: fontFamily.sans.semibold, fontSize: 13, color: colors.g900, marginBottom: 8 }}>💬 Personal Message</Text>
        <TextInput
          style={s.textInput}
          multiline
          defaultValue="I've been using Propian and it changed how I approach prop trading. Join me!"
          placeholderTextColor={colors.g400}
        />
      </View>

      {/* Format */}
      <View style={s.card}>
        <Text style={{ fontFamily: fontFamily.sans.semibold, fontSize: 13, color: colors.g900, marginBottom: 8 }}>📐 Card Format</Text>
        <View style={{ flexDirection: "row", borderRadius: radii.md, overflow: "hidden", borderWidth: 1, borderColor: colors.g100 }}>
          {formats.map((f, i) => (
            <TouchableOpacity key={f} style={[s.formatBtn, selectedFormat === i && s.formatBtnActive]} onPress={() => setSelectedFormat(i)}>
              <Text style={[s.formatBtnText, selectedFormat === i && s.formatBtnTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );
}

/* ─── Styles ─── */

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.g50 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.g100 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.g50, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: fontFamily.sans.bold, color: colors.g900 },
  tabScroll: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.g100 },
  tabScrollContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radii.md },
  tabBtnActive: { backgroundColor: colors.g900 },
  tabText: { fontSize: 13, fontFamily: fontFamily.sans.semibold, color: colors.g400 },
  tabTextActive: { color: colors.white },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 14 },

  /* Invite Card */
  inviteCard: { backgroundColor: colors.g900, borderRadius: radii.xl, padding: 22 },
  inviteLabel: { fontSize: 10, fontFamily: fontFamily.sans.semibold, color: colors.g400, letterSpacing: 0.5, marginBottom: 4 },
  codeRow: { flexDirection: "row", borderRadius: radii.md, overflow: "hidden", borderWidth: 1, borderColor: colors.g700, marginTop: 10 },
  codeText: { flex: 1, padding: 12, backgroundColor: colors.g800, fontFamily: fontFamily.mono.regular, fontSize: 16, fontWeight: "700", color: colors.lime, letterSpacing: 2 },
  copyBtn: { paddingHorizontal: 16, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  copyBtnText: { fontFamily: fontFamily.sans.bold, fontSize: 11, color: colors.black },
  linkRow: { marginTop: 8, borderRadius: radii.md, borderWidth: 1, borderColor: colors.g700, backgroundColor: colors.g800, padding: 10 },
  linkText: { fontFamily: fontFamily.mono.regular, fontSize: 10, color: colors.g400 },
  shareBtn: { marginTop: 12, borderRadius: radii.md, borderWidth: 1, borderColor: colors.g700, backgroundColor: colors.g800, paddingVertical: 12, alignItems: "center" },
  shareBtnText: { fontFamily: fontFamily.sans.semibold, fontSize: 12, color: colors.g300 },
  benefitBox: { marginTop: 14, padding: 12, backgroundColor: colors.g800, borderRadius: radii.md, flexDirection: "row", alignItems: "center", gap: 10 },
  benefitTitle: { fontSize: 12, fontFamily: fontFamily.sans.semibold, color: colors.lime },
  benefitSub: { fontSize: 10, fontFamily: fontFamily.sans.regular, color: colors.g500, marginTop: 2 },

  /* Stats */
  statsRow: { flexDirection: "row", backgroundColor: colors.white, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.g100, overflow: "hidden" },
  statBox: { flex: 1, paddingVertical: 18, paddingHorizontal: 6, alignItems: "center" },
  statBorderX: { borderLeftWidth: 1, borderRightWidth: 1, borderLeftColor: colors.g100, borderRightColor: colors.g100 },
  statVal: { fontSize: 22, fontFamily: fontFamily.mono.medium, fontWeight: "900", color: colors.g900 },
  statLabel: { fontSize: 9, fontFamily: fontFamily.sans.semibold, color: colors.g400, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },
  statSub: { fontSize: 10, fontFamily: fontFamily.sans.semibold, marginTop: 3 },

  /* Card */
  card: { backgroundColor: colors.white, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.g100, padding: 16 },
  sectionLabel: { fontSize: 10, fontFamily: fontFamily.sans.semibold, color: colors.g400, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 4 },

  /* Referral rows */
  refRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  refName: { fontSize: 13, fontFamily: fontFamily.sans.semibold, color: colors.g900 },
  refDate: { fontSize: 10, fontFamily: fontFamily.sans.regular, color: colors.g400 },
  refReward: { fontSize: 11, fontFamily: fontFamily.sans.semibold },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusText: { fontSize: 9, fontFamily: fontFamily.sans.bold, textTransform: "capitalize" },

  /* Empty */
  emptyCard: { backgroundColor: colors.white, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.g100, padding: 32, alignItems: "center" },
  emptyTitle: { fontSize: 14, fontFamily: fontFamily.sans.bold, color: colors.g900, marginBottom: 4 },
  emptyDesc: { fontSize: 12, fontFamily: fontFamily.sans.regular, color: colors.g400, textAlign: "center" },

  /* Filter chips */
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.g200, backgroundColor: colors.white, marginRight: 6 },
  filterChipActive: { backgroundColor: colors.g900, borderColor: colors.g900 },
  filterChipText: { fontSize: 12, fontFamily: fontFamily.sans.semibold, color: colors.g500 },
  filterChipTextActive: { color: colors.lime },

  /* Podium */
  podiumCard: { width: (SCREEN_W - 56) / 3, backgroundColor: colors.white, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.g100, padding: 14, alignItems: "center", marginRight: 8 },
  podiumCardFirst: { borderColor: colors.lime, borderWidth: 2, marginTop: -8 },
  podiumName: { fontSize: 12, fontFamily: fontFamily.sans.bold, color: colors.g900, marginTop: 6, textAlign: "center" },
  podiumCount: { fontSize: 22, fontFamily: fontFamily.mono.medium, fontWeight: "900", color: colors.lime, marginVertical: 4 },
  podiumReward: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: `${colors.lime}18`, borderRadius: 999 },
  podiumRewardText: { fontSize: 10, fontFamily: fontFamily.sans.semibold, color: colors.lime },

  /* Leaderboard rows */
  lbRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 4, gap: 8 },
  lbRowMe: { backgroundColor: `${colors.lime}12`, borderWidth: 2, borderColor: colors.lime, borderRadius: radii.md, marginVertical: 2, paddingHorizontal: 8 },
  lbRank: { width: 28, fontSize: 15, fontFamily: fontFamily.mono.medium, fontWeight: "800", color: colors.g900, textAlign: "center" },
  lbName: { fontSize: 13, fontFamily: fontFamily.sans.semibold, color: colors.g900, flexShrink: 1 },
  youBadge: { backgroundColor: colors.lime, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999 },
  youBadgeText: { fontSize: 9, fontFamily: fontFamily.sans.bold, color: colors.black },
  lbCount: { fontSize: 14, fontFamily: fontFamily.mono.medium, fontWeight: "800", color: colors.g900 },
  lbEarned: { fontSize: 11, fontFamily: fontFamily.mono.regular, color: colors.lime, fontWeight: "700" },
  lbTierPill: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },

  /* Tier cards */
  tierGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tierCard: { width: (SCREEN_W - 32 - 10) / 2, backgroundColor: colors.white, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.g100, padding: 14, alignItems: "center", position: "relative" },
  tierBadge: { position: "absolute", top: -10, backgroundColor: colors.lime, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999 },
  tierBadgeText: { fontSize: 9, fontFamily: fontFamily.sans.bold, color: colors.black },
  tierIcon: { fontSize: 26, marginBottom: 4 },
  tierName: { fontSize: 13, fontFamily: fontFamily.sans.bold, color: colors.g900, marginBottom: 2 },
  tierReq: { fontSize: 10, fontFamily: fontFamily.sans.regular, color: colors.g400, marginBottom: 6 },
  tierReward: { fontSize: 10, fontFamily: fontFamily.sans.regular, color: colors.g600, lineHeight: 16, alignSelf: "flex-start" },

  /* Reward history */
  rewardRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },

  /* Invite card preview */
  previewOuter: { borderRadius: radii.xl, borderWidth: 2, borderColor: colors.lime, overflow: "hidden" },
  previewInner: { backgroundColor: colors.g900, padding: 24, alignItems: "center" },

  /* Action buttons */
  actionBtn: { borderRadius: radii.md, paddingVertical: 12, alignItems: "center" },
  actionBtnText: { fontFamily: fontFamily.sans.bold, fontSize: 13 },

  /* Theme selector */
  themeBox: { flex: 1, height: 48, borderRadius: radii.md, borderWidth: 1, borderColor: colors.g200, alignItems: "center", justifyContent: "flex-end", paddingBottom: 5 },

  /* Text input */
  textInput: { borderWidth: 1, borderColor: colors.g200, borderRadius: radii.md, padding: 12, fontFamily: fontFamily.sans.regular, fontSize: 13, color: colors.g900, minHeight: 70, textAlignVertical: "top" },

  /* Format toggle */
  formatBtn: { flex: 1, paddingVertical: 10, alignItems: "center", backgroundColor: colors.g100 },
  formatBtnActive: { backgroundColor: colors.g900 },
  formatBtnText: { fontSize: 11, fontFamily: fontFamily.sans.semibold, color: colors.g500 },
  formatBtnTextActive: { color: colors.lime },
});
