"use client";

import { useState } from "react";
import {
  useReferralProfile,
  useUserReferrals,
  useReferralLeaderboard,
} from "@propian/shared/hooks";
import type { ReferralTier, ReferralTierMeta } from "@propian/shared/types";
import { createBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

/* ─── Constants ─── */

const TIER_META: ReferralTierMeta[] = [
  {
    key: "bronze",
    name: "Bronze",
    icon: "🥉",
    minReferrals: 1,
    rewardPct: 10,
    rewards: [
      "7 days Pro per referral",
      "Bronze profile badge",
      "Access to referral dashboard",
    ],
  },
  {
    key: "silver",
    name: "Silver",
    icon: "🥈",
    minReferrals: 10,
    rewardPct: 15,
    rewards: [
      "7 days Pro per referral",
      "Silver profile badge",
      "Priority support",
      "$10 credit per referral",
      "Custom invite card",
    ],
  },
  {
    key: "gold",
    name: "Gold",
    icon: "🥇",
    minReferrals: 50,
    rewardPct: 20,
    rewards: [
      "14 days Pro per referral",
      "Gold profile badge",
      "VIP support",
      "$15 credit per referral",
      "Custom invite page",
      "Early access to features",
    ],
  },
  {
    key: "diamond",
    name: "Diamond",
    icon: "💎",
    minReferrals: 100,
    rewardPct: 25,
    rewards: [
      "Lifetime Pro",
      "Diamond profile badge",
      "Dedicated account manager",
      "$20 credit per referral",
      "Revenue share program",
      "Feature co-creation",
    ],
  },
];

type Tab = "dashboard" | "leaderboard" | "rewards" | "invite-card";
const TABS: { key: Tab; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "leaderboard", label: "Leaderboard" },
  { key: "rewards", label: "Rewards" },
  { key: "invite-card", label: "Invite Card" },
];

function tierColor(tier: ReferralTier): string {
  switch (tier) {
    case "diamond":
      return "#b9f2ff";
    case "gold":
      return "#FFD700";
    case "silver":
      return "#C0C0C0";
    default:
      return "#cd7f32";
  }
}

function statusColor(status: string): { fg: string; bg: string; border: string } {
  switch (status) {
    case "active":
      return { fg: "var(--green)", bg: "var(--green)15", border: "var(--green)30" };
    case "pending":
      return { fg: "var(--amber)", bg: "var(--amber)15", border: "var(--amber)30" };
    default:
      return { fg: "var(--g400)", bg: "var(--g400)15", border: "var(--g400)30" };
  }
}

/* ─── Loading ─── */

function LoadingSkeleton() {
  return (
    <div className="pt-col" style={{ gap: 16 }}>
      <Skeleton width="100%" height={280} borderRadius={16} />
      <div className="pt-row" style={{ gap: 12 }}>
        <Skeleton width="33%" height={120} borderRadius={12} />
        <Skeleton width="33%" height={120} borderRadius={12} />
        <Skeleton width="33%" height={120} borderRadius={12} />
      </div>
      <Skeleton width="100%" height={300} borderRadius={12} />
    </div>
  );
}

/* ─── Main ─── */

export default function ReferralsPage() {
  const supabase = createBrowserClient();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const { data: profile, isLoading: profileLoading } = useReferralProfile(supabase);
  const { data: referrals, isLoading: referralsLoading } = useUserReferrals(supabase);
  const { data: leaderboard, isLoading: lbLoading } = useReferralLeaderboard(supabase);

  const referralLink = profile ? `https://propian.app/join?ref=${profile.referral_code}` : "";
  const currentTierMeta = TIER_META.find((t) => t.key === profile?.tier) ?? TIER_META[0];
  const nextTierMeta = TIER_META[TIER_META.indexOf(currentTierMeta) + 1] ?? null;
  const proDaysEarned = (profile?.total_referrals ?? 0) * 7;
  const userRank = leaderboard?.findIndex((e) => e.user_id === profile?.user_id);
  const rankDisplay = userRank !== undefined && userRank >= 0 ? `#${userRank + 1}` : "—";

  function copyText(text: string, kind: "code" | "link") {
    navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  function shareTwitter() {
    const text = encodeURIComponent(`Join me on Propian! Use my referral code ${profile?.referral_code ?? ""} to get started 🚀`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(`Join me on Propian! ${referralLink}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  function shareTelegram() {
    const url = encodeURIComponent(referralLink);
    const text = encodeURIComponent("Join me on Propian!");
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
  }

  function shareEmail() {
    const subject = encodeURIComponent("Join me on Propian!");
    const body = encodeURIComponent(`Hey! I've been using Propian and think you'd love it. Use my referral code ${profile?.referral_code ?? ""} to get 7 days of Pro free.\n\n${referralLink}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  if (profileLoading) {
    return (
      <div className="pt-container">
        <h1 className="pt-page-title">Referrals</h1>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="pt-container">
      <h1 className="pt-page-title">Referrals</h1>

      {/* Tabs */}
      <div className="pt-period-tabs" style={{ marginBottom: 24 }}>
        {TABS.map((t) => (
          <button key={t.key} className={`pt-period-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <DashboardTab
          profile={profile} referralLink={referralLink} copied={copied} copyText={copyText}
          shareTwitter={shareTwitter} shareWhatsApp={shareWhatsApp} shareTelegram={shareTelegram} shareEmail={shareEmail}
          proDaysEarned={proDaysEarned} rankDisplay={rankDisplay} currentTierMeta={currentTierMeta}
          nextTierMeta={nextTierMeta} referrals={referrals ?? []} referralsLoading={referralsLoading} setTab={setTab}
        />
      )}
      {tab === "leaderboard" && (
        <LeaderboardTab entries={leaderboard ?? []} isLoading={lbLoading} currentUserId={profile?.user_id} />
      )}
      {tab === "rewards" && (
        <RewardsTab
          currentTier={profile?.tier ?? "bronze"} totalReferrals={profile?.total_referrals ?? 0}
          proDaysEarned={proDaysEarned} totalEarnings={profile?.total_earnings ?? 0} referrals={referrals ?? []}
        />
      )}
      {tab === "invite-card" && <InviteCardTab referralCode={profile?.referral_code ?? "--------"} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD TAB
   ═══════════════════════════════════════════════════════════════ */

function DashboardTab({
  profile, referralLink, copied, copyText, shareTwitter, shareWhatsApp, shareTelegram, shareEmail,
  proDaysEarned, rankDisplay, currentTierMeta, nextTierMeta, referrals, referralsLoading, setTab,
}: {
  profile: any; referralLink: string; copied: "code" | "link" | null;
  copyText: (t: string, k: "code" | "link") => void;
  shareTwitter: () => void; shareWhatsApp: () => void; shareTelegram: () => void; shareEmail: () => void;
  proDaysEarned: number; rankDisplay: string; currentTierMeta: ReferralTierMeta; nextTierMeta: ReferralTierMeta | null;
  referrals: any[]; referralsLoading: boolean; setTab: (t: Tab) => void;
}) {
  const totalRefs = profile?.total_referrals ?? 0;
  const progressPct = nextTierMeta
    ? Math.min(100, ((totalRefs - currentTierMeta.minReferrals) / (nextTierMeta.minReferrals - currentTierMeta.minReferrals)) * 100)
    : 100;

  const monthlyData = [
    { month: "Sep", val: 2 }, { month: "Oct", val: 3 }, { month: "Nov", val: 4 },
    { month: "Dec", val: 5 }, { month: "Jan", val: 4 }, { month: "Feb", val: 6 },
  ];
  const maxVal = Math.max(...monthlyData.map((m) => m.val));

  return (
    <>
      {/* Hero */}
      <div className="pt-ref-hero">
        {/* Left: Invite Card */}
        <div className="pt-ref-invite-card">
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 13, color: "var(--g500)", marginBottom: 4 }}>Your referral code</div>
            <div className="pt-ref-code-box">
              <div className="pt-ref-code"><span>{profile?.referral_code ?? "--------"}</span></div>
              <button className="pt-ref-copy" onClick={() => copyText(profile?.referral_code ?? "", "code")}>
                {copied === "code" ? <>✓ Copied!</> : <>📋 Copy</>}
              </button>
            </div>
            <div className="pt-ref-link-box">
              <div className="pt-ref-link">{referralLink || "---"}</div>
              <button className="pt-ref-copy" style={{ fontSize: 11, padding: "8px 16px" }} onClick={() => copyText(referralLink, "link")}>
                {copied === "link" ? "✓ Copied!" : "Copy Link"}
              </button>
            </div>
            <div className="pt-ref-share-row">
              {[
                { name: "Twitter / X", icon: "𝕏", fn: shareTwitter },
                { name: "WhatsApp", icon: "💬", fn: shareWhatsApp },
                { name: "Telegram", icon: "✈️", fn: shareTelegram },
                { name: "Email", icon: "📧", fn: shareEmail },
              ].map((s) => (
                <button key={s.name} className="pt-ref-share-btn" onClick={s.fn}>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>{s.name}
                </button>
              ))}
            </div>
            {/* Benefit callout */}
            <div style={{ marginTop: 20, padding: 14, background: "var(--g800)", borderRadius: "var(--r-md)", display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
              <span style={{ fontSize: 20 }}>🎁</span>
              <div>
                <span style={{ color: "var(--lime)", fontWeight: 600 }}>Both you and your friend get 7 days of Pro free</span>
                <div style={{ color: "var(--g500)", marginTop: 2 }}>when they sign up and complete their profile</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Stats + Progress + Quick actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="pt-ref-stats">
            <div className="pt-ref-stat">
              <div className="pt-ref-stat-val" style={{ color: "var(--lime-dim)" }}>{totalRefs}</div>
              <div className="pt-ref-stat-label">Total Referrals</div>
              <div className="pt-ref-stat-sub" style={{ color: "var(--green)" }}>+{Math.min(totalRefs, 6)} this month</div>
            </div>
            <div className="pt-ref-stat">
              <div className="pt-ref-stat-val" style={{ color: "var(--green)" }}>{proDaysEarned}</div>
              <div className="pt-ref-stat-label">Pro Days Earned</div>
              <div className="pt-ref-stat-sub" style={{ color: "var(--g400)" }}>7 days per referral</div>
            </div>
            <div className="pt-ref-stat">
              <div className="pt-ref-stat-val">{rankDisplay}</div>
              <div className="pt-ref-stat-label">Your Rank</div>
              <div className="pt-ref-stat-sub" style={{ color: "var(--amber)" }}>Top 5% of referrers</div>
            </div>
          </div>

          {/* Progress to next tier */}
          <div style={{ border: "var(--brd)", borderRadius: "var(--r-lg)", background: "var(--white)", padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>🔥 Progress to <span style={{ color: "var(--lime-dim)" }}>{nextTierMeta?.name ?? "Max"} Tier</span></div>
              <span style={{ fontSize: 12, fontFamily: "var(--mono)", fontWeight: 600 }}>{totalRefs} / {nextTierMeta?.minReferrals ?? totalRefs} referrals</span>
            </div>
            <div style={{ height: 12, background: "var(--g100)", borderRadius: "var(--r-full)", overflow: "hidden", position: "relative" }}>
              <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg, var(--lime), #ffd700)", borderRadius: "var(--r-full)", transition: "width .8s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "var(--g400)" }}>
              <span>{currentTierMeta.icon} {currentTierMeta.name} (current)</span>
              {nextTierMeta && <span>{nextTierMeta.icon} {nextTierMeta.name} ({nextTierMeta.minReferrals})</span>}
            </div>
          </div>

          {/* Quick action cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ border: "var(--brd)", borderRadius: "var(--r-md)", padding: 16, background: "var(--white)", cursor: "pointer", transition: "all .15s ease", textAlign: "center" }} onClick={() => setTab("invite-card")}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>🎨</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Custom Invite Card</div>
              <div style={{ fontSize: 11, color: "var(--g400)" }}>Share a branded card</div>
            </div>
            <div style={{ border: "var(--brd)", borderRadius: "var(--r-md)", padding: 16, background: "var(--white)", cursor: "pointer", transition: "all .15s ease", textAlign: "center" }} onClick={() => setTab("leaderboard")}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>🏆</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Referral Leaderboard</div>
              <div style={{ fontSize: 11, color: "var(--g400)" }}>You&apos;re ranked {rankDisplay}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Referrals */}
      <div className="pt-sub">
        <p className="pt-sub-label">Recent Referrals</p>
        {referralsLoading ? (
          <div className="pt-col" style={{ gap: 8 }}>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} width="100%" height={52} borderRadius={12} />)}</div>
        ) : !referrals.length ? (
          <EmptyState title="No referrals yet" description="Share your code to start earning Pro days." />
        ) : (
          <div style={{ border: "var(--brd)", borderRadius: "var(--r-lg)", overflow: "hidden", background: "var(--white)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 120px 100px 100px", gap: 12, padding: "10px 20px", background: "var(--g50)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--g400)" }}>
              <span /><span>User</span><span>Joined</span><span>Status</span><span>Reward</span>
            </div>
            {referrals.map((ref) => {
              const sc = statusColor(ref.status);
              return (
                <div key={ref.id} style={{ display: "grid", gridTemplateColumns: "48px 1fr 120px 100px 100px", gap: 12, padding: "14px 20px", borderBottom: "var(--brd-l)", alignItems: "center", fontSize: 13 }}>
                  <Avatar src={ref.referred_user?.avatar_url} name={ref.referred_user?.display_name ?? "User"} size="sm" />
                  <div style={{ fontWeight: 600 }}>{ref.referred_user?.display_name ?? "Unknown"}</div>
                  <div style={{ fontSize: 12, color: "var(--g400)" }}>
                    {new Date(ref.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                  <div>
                    <span style={{ padding: "3px 10px", borderRadius: "var(--r-full)", fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}` }}>{ref.status}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: ref.status === "active" ? "var(--green)" : ref.status === "pending" ? "var(--amber)" : "var(--g400)" }}>
                    {ref.status === "active" ? "+7 days Pro" : ref.status === "pending" ? "Awaiting profile" : "No signup"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly Referrals Chart */}
      <div className="pt-sub">
        <p className="pt-sub-label">Monthly Referrals</p>
        <div style={{ border: "var(--brd)", borderRadius: "var(--r-lg)", background: "var(--white)", padding: 20 }}>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 140 }}>
            {monthlyData.map((m) => (
              <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--mono)", color: m.month === "Feb" ? "var(--lime-dim)" : "var(--g500)" }}>{m.val}</div>
                <div style={{ width: "100%", background: m.month === "Feb" ? "var(--lime)" : "var(--g200)", borderRadius: 4, height: `${(m.val / maxVal) * 100}%`, minHeight: 8, transition: "height .6s ease" }} />
                <div style={{ fontSize: 10, color: "var(--g400)" }}>{m.month}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LEADERBOARD TAB
   ═══════════════════════════════════════════════════════════════ */

function LeaderboardTab({ entries, isLoading, currentUserId }: { entries: any[]; isLoading: boolean; currentUserId?: string }) {
  const [filter, setFilter] = useState(0);

  if (isLoading) {
    return (
      <div className="pt-col" style={{ gap: 12 }}>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} width="100%" height={180} borderRadius={16} />)}
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={`r-${i}`} width="100%" height={56} borderRadius={12} />)}
      </div>
    );
  }

  if (!entries.length) {
    return <EmptyState title="No referral leaders yet" description="Be the first to climb the referral leaderboard!" />;
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <>
      {/* Filters */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["All Time", "This Month", "This Week"].map((f, i) => (
            <button key={f} className={`pt-filter-chip ${filter === i ? "active" : ""}`} onClick={() => setFilter(i)}>{f}</button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--g400)" }}>Updated hourly</div>
      </div>

      {/* Top 3 Podium */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        {podiumOrder.map((p) => {
          const isFirst = p.rank === 1;
          return (
            <div key={p.user_id} style={{ border: isFirst ? "2px solid var(--lime)" : "var(--brd)", borderRadius: "var(--r-xl)", background: "var(--white)", padding: 28, textAlign: "center", transform: isFirst ? "translateY(-8px)" : "none", boxShadow: isFirst ? "var(--sh-md)" : "none" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>{p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : "🥉"}</div>
              <Avatar src={p.user?.avatar_url} name={p.user?.display_name ?? "Trader"} size="lg" />
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2, marginTop: 10 }}>{p.user?.display_name ?? "Unknown"}</div>
              <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "var(--mono)", color: "var(--lime-dim)", margin: "8px 0" }}>{p.total_referrals}</div>
              <div style={{ fontSize: 11, color: "var(--g400)" }}>referrals</div>
              <div style={{ marginTop: 10, padding: "4px 12px", background: "var(--lime-10)", borderRadius: "var(--r-full)", fontSize: 11, fontWeight: 600, color: "var(--lime-dim)", display: "inline-block" }}>${p.total_earnings.toFixed(0)} credit</div>
            </div>
          );
        })}
      </div>

      {/* Full Table */}
      {rest.length > 0 && (
        <div style={{ border: "var(--brd)", borderRadius: "var(--r-lg)", overflow: "hidden", background: "var(--white)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "48px 48px 1fr 100px 100px 80px", gap: 12, padding: "10px 20px", background: "var(--g50)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--g400)" }}>
            <span>Rank</span><span /><span>Trader</span><span>Referrals</span><span>Reward</span><span>Tier</span>
          </div>
          {rest.map((r) => {
            const isMe = r.user_id === currentUserId;
            return (
              <div key={r.user_id} className={`pt-ref-lb-row ${isMe ? "me" : ""}`}>
                <div className="pt-ref-lb-rank" style={{ color: isMe ? "var(--lime-dim)" : "var(--g400)" }}>{r.rank}</div>
                <Avatar src={r.user?.avatar_url} name={r.user?.display_name ?? "Trader"} size="sm" />
                <div>
                  <span style={{ fontWeight: isMe ? 700 : 600, fontSize: 14 }}>{r.user?.display_name ?? "Unknown"}</span>
                  {isMe && <span style={{ marginLeft: 6, fontSize: 10, padding: "2px 8px", background: "var(--lime)", color: "var(--black)", borderRadius: "var(--r-full)", fontWeight: 700 }}>YOU</span>}
                </div>
                <div style={{ fontWeight: 700, fontFamily: "var(--mono)", fontSize: 15, color: isMe ? "var(--lime-dim)" : "var(--black)" }}>{r.total_referrals}</div>
                <div style={{ fontWeight: 600, fontFamily: "var(--mono)", fontSize: 13, color: "var(--green)" }}>${r.total_earnings.toFixed(0)}</div>
                <div style={{ fontSize: 11, fontWeight: 500 }}>{TIER_META.find((t) => t.key === r.tier)?.icon} {r.tier.charAt(0).toUpperCase() + r.tier.slice(1)}</div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   REWARDS TAB
   ═══════════════════════════════════════════════════════════════ */

function RewardsTab({ currentTier, totalReferrals, proDaysEarned, totalEarnings, referrals }: {
  currentTier: ReferralTier; totalReferrals: number; proDaysEarned: number; totalEarnings: number; referrals: any[];
}) {
  const tierReqLabels: Record<ReferralTier, string> = {
    bronze: "1–9 referrals", silver: "10–49 referrals", gold: "50–99 referrals", diamond: "100+ referrals",
  };

  const rewardHistory = referrals.slice(0, 8).map((ref) => ({
    reward: ref.status === "active" ? "+7 days Pro" : "Awaiting profile",
    icon: ref.status === "active" ? "⏱" : "⏳",
    from: `${ref.referred_user?.display_name ?? "User"} signup`,
    date: new Date(ref.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    status: ref.status === "active" ? "Applied" : "Pending",
    statusColor: ref.status === "active" ? "var(--green)" : "var(--amber)",
  }));

  return (
    <>
      {/* Tier Grid */}
      <div className="pt-sub">
        <p className="pt-sub-label">Referral Tiers</p>
        <div className="pt-ref-tiers">
          {TIER_META.map((tier) => (
            <div key={tier.key} className={`pt-ref-tier ${tier.key === currentTier ? "current" : ""}`}>
              {tier.key === currentTier && (
                <div className="pt-ref-tier-badge" style={{ background: "var(--lime)", color: "var(--black)" }}>Current Tier</div>
              )}
              <div className="pt-ref-tier-icon">{tier.icon}</div>
              <div className="pt-ref-tier-name">{tier.name}</div>
              <div className="pt-ref-tier-req">{tierReqLabels[tier.key]}</div>
              <div className="pt-ref-tier-rewards">
                {tier.rewards.map((r) => (
                  <div key={r} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ color: "var(--lime-dim)", fontSize: 10 }}>✓</span>{r}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reward History */}
      <div className="pt-sub">
        <p className="pt-sub-label">Reward History</p>
        {rewardHistory.length === 0 ? (
          <EmptyState title="No rewards yet" description="Start referring friends to earn rewards." />
        ) : (
          <div style={{ border: "var(--brd)", borderRadius: "var(--r-lg)", overflow: "hidden", background: "var(--white)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 120px 120px", gap: 12, padding: "10px 20px", background: "var(--g50)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--g400)" }}>
              <span>Reward</span><span>From</span><span>Date</span><span>Status</span>
            </div>
            {rewardHistory.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 140px 120px 120px", gap: 12, padding: "14px 20px", borderBottom: "var(--brd-l)", alignItems: "center", fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}><span style={{ fontSize: 16 }}>{r.icon}</span>{r.reward}</div>
                <div style={{ fontSize: 12, color: "var(--g500)" }}>{r.from}</div>
                <div style={{ fontSize: 12, color: "var(--g400)" }}>{r.date}</div>
                <div><span style={{ padding: "3px 10px", borderRadius: "var(--r-full)", fontSize: 10, fontWeight: 600, background: `${r.statusColor}15`, color: r.statusColor }}>{r.status}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Benefits */}
      <div className="pt-sub">
        <p className="pt-sub-label">Your Active Benefits</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { icon: "⏱", title: `${proDaysEarned} Pro Days`, desc: `Accumulated from ${totalReferrals} referrals`, color: "var(--lime)" },
            { icon: "💰", title: `$${totalEarnings.toFixed(0)} Credit`, desc: "Usable for challenges & courses", color: "var(--green)" },
            { icon: TIER_META.find((t) => t.key === currentTier)?.icon ?? "🥉", title: `${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Badge`, desc: "Displayed on your profile", color: tierColor(currentTier) },
          ].map((b) => (
            <div key={b.title} style={{ border: "var(--brd)", borderRadius: "var(--r-lg)", background: "var(--white)", padding: 22, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{b.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{b.title}</div>
              <div style={{ fontSize: 11, color: "var(--g400)", marginBottom: 12 }}>{b.desc}</div>
              <div style={{ height: 6, background: "var(--g100)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "100%", background: b.color, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INVITE CARD TAB
   ═══════════════════════════════════════════════════════════════ */

function InviteCardTab({ referralCode }: { referralCode: string }) {
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState(0);
  const [selectedStats, setSelectedStats] = useState([0, 1]);

  const themes = [
    { name: "Dark", bg: "linear-gradient(135deg, #0a0a0a, #1a1a2e)" },
    { name: "Lime", bg: "linear-gradient(135deg, #0a0a0a, #1a2e0a)" },
    { name: "Blue", bg: "linear-gradient(135deg, #0a0a2e, #1a1a3e)" },
    { name: "Warm", bg: "linear-gradient(135deg, #1a0a0a, #2e1a1a)" },
  ];

  const formats = ["Square (IG)", "Story (9:16)", "Banner (16:9)"];

  const stats = [
    { label: "Win Rate", val: "68%" },
    { label: "Monthly P&L", val: "+$12,840" },
    { label: "Funded Accounts", val: "4" },
    { label: "Member Since", val: "Aug 2025" },
  ];

  function toggleStat(idx: number) {
    setSelectedStats((prev) => prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
      {/* Left: Preview */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--g400)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Card Preview</div>
        <div className="pt-ref-preview">
          <div className="pt-ref-preview-inner" style={{ padding: 40 }}>
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--g500)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>You&apos;ve been invited to</div>
              <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 4 }}>Prop<span style={{ color: "var(--lime)" }}>ian</span></div>
              <div style={{ fontSize: 13, color: "var(--g400)", marginBottom: 24, maxWidth: 300, margin: "0 auto 24px" }}>The social network for prop traders. Compare firms, learn strategies, and track your funded journey.</div>

              {/* Platform stats */}
              <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 24 }}>
                {[{ v: "12K+", l: "Traders" }, { v: "45", l: "Firms Rated" }, { v: "98K+", l: "Reviews" }].map((s) => (
                  <div key={s.l}>
                    <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--mono)", color: "var(--lime)" }}>{s.v}</div>
                    <div style={{ fontSize: 9, color: "var(--g500)" }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Inviter info */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--lime)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "var(--black)" }}>PT</div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Propian User</div>
                  <div style={{ fontSize: 11, color: "var(--g400)" }}>invites you to join</div>
                </div>
              </div>

              {/* Referral code */}
              <div style={{ background: "var(--g800)", borderRadius: "var(--r-md)", padding: 14, display: "inline-block" }}>
                <div style={{ fontSize: 10, color: "var(--g500)", marginBottom: 4 }}>USE CODE</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--mono)", color: "var(--lime)", letterSpacing: 3 }}>{referralCode}</div>
              </div>

              <div style={{ marginTop: 16, fontSize: 11, color: "var(--lime)" }}>🎁 Get 7 days of Pro free</div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "center" }}>
          <button style={{ padding: "10px 20px", background: "var(--lime)", color: "var(--black)", border: "none", borderRadius: "var(--r-md)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 6 }}>📥 Download Card</button>
          <button style={{ padding: "10px 20px", background: "var(--black)", color: "var(--white)", border: "none", borderRadius: "var(--r-md)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 6 }}>📤 Share</button>
        </div>
      </div>

      {/* Right: Customize */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--g400)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Customize</div>

        {/* Card Style */}
        <div style={{ border: "var(--brd)", borderRadius: "var(--r-lg)", background: "var(--white)", padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>🎨 Card Style</div>

          {/* Background theme */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--g400)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Background Theme</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {themes.map((t, i) => (
                <div key={t.name} style={{ height: 56, borderRadius: "var(--r-md)", background: t.bg, border: selectedTheme === i ? "2px solid var(--lime)" : "var(--brd)", cursor: "pointer", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 6 }} onClick={() => setSelectedTheme(i)}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--white)" }}>{t.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Personal message */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--g400)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 6 }}>Personal Message</div>
            <textarea className="pt-textarea" style={{ minHeight: 80 }} defaultValue="I've been using Propian for 3 months and it completely changed how I approach prop firm challenges. Join me!" />
          </div>

          {/* Card format */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--g400)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Card Format</div>
            <div style={{ display: "flex", gap: 0, border: "var(--brd)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
              {formats.map((f, i) => (
                <button key={f} style={{ flex: 1, padding: 9, border: "none", background: selectedFormat === i ? "var(--black)" : "var(--g100)", color: selectedFormat === i ? "var(--lime)" : "var(--g500)", fontWeight: 600, fontSize: 11, fontFamily: "var(--font)", cursor: "pointer" }} onClick={() => setSelectedFormat(i)}>{f}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats to Display */}
        <div style={{ border: "var(--brd)", borderRadius: "var(--r-lg)", background: "var(--white)", padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>📊 Your Stats to Display</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {stats.map((s, i) => {
              const active = selectedStats.includes(i);
              return (
                <div key={s.label} style={{ padding: 14, border: active ? "2px solid var(--lime)" : "var(--brd)", borderRadius: "var(--r-md)", background: active ? "var(--lime-10)" : "var(--white)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }} onClick={() => toggleStat(i)}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--g400)" }}>{s.label}</div>
                    <div style={{ fontWeight: 700, fontFamily: "var(--mono)", fontSize: 14 }}>{s.val}</div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: 4, border: active ? "none" : "var(--brd)", background: active ? "var(--lime)" : "var(--white)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--black)" }}>
                    {active && "✓"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
