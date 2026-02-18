import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Dimensions,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path, Circle, Line } from "react-native-svg";
import {
  useSentiments,
  useSentimentHero,
  useSentimentHistory,
} from "@propian/shared/hooks";
import {
  computeMovers,
  computeExtremes,
  computeDivergences,
} from "@propian/shared/api";
import type {
  SentimentData,
  SentimentHistory,
  AssetClass,
  HistoryPeriod,
} from "@propian/shared/types";
import {
  INSTRUMENT_META,
  allInstruments,
  type Instrument,
} from "@propian/shared/constants";
import { Skeleton } from "@/components/ui/Skeleton";
import { IconArrow } from "@/components/icons/IconArrow";
import { colors, fontFamily, radii } from "@/theme";
import { supabase } from "@/lib/supabase";

const SCREEN_W = Dimensions.get("window").width;
const CARD_PAD = 16;

/* ─── Constants ─── */

type Tab = "overview" | "heatmap" | "history";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "heatmap", label: "Heatmap" },
  { key: "history", label: "History" },
];

const ASSET_TABS: { key: AssetClass | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "forex", label: "Forex" },
  { key: "crypto", label: "Crypto" },
  { key: "indices", label: "Indices" },
  { key: "commodities", label: "Commodities" },
];

const PERIOD_TABS = ["LIVE", "1H", "4H", "1D"] as const;
const HISTORY_PERIODS: HistoryPeriod[] = ["1D", "1W", "1M", "3M"];

/* ─── SVG Gauge ─── */

function SentimentGauge({ longPct }: { longPct: number }) {
  const shortPct = 100 - longPct;
  const angle = Math.PI * (1 - longPct / 100);
  const nx = 50 + 32 * Math.cos(angle);
  const ny = 50 - 32 * Math.sin(angle);

  return (
    <View style={{ alignItems: "center", marginBottom: 6 }}>
      <Svg width={100} height={54} viewBox="0 0 100 54">
        {/* Background arc */}
        <Path
          d="M 5 50 A 45 45 0 0 1 95 50"
          fill="none"
          stroke={colors.g100}
          strokeWidth={8}
          strokeLinecap="round"
        />
        {/* Long (lime) from left */}
        <Path
          d="M 5 50 A 45 45 0 0 1 95 50"
          fill="none"
          stroke={colors.lime}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${longPct * 1.41} 200`}
        />
        {/* Short (red) from right */}
        <Path
          d="M 95 50 A 45 45 0 0 0 5 50"
          fill="none"
          stroke={colors.red}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${shortPct * 1.41} 200`}
        />
        {/* Needle */}
        <Line
          x1={50} y1={50} x2={nx} y2={ny}
          stroke={colors.black} strokeWidth={2} strokeLinecap="round"
        />
        <Circle cx={50} cy={50} r={4} fill={colors.black} />
      </Svg>
    </View>
  );
}

/* ─── Sentiment Bar ─── */

function SentBar({ longPct }: { longPct: number }) {
  return (
    <View style={s.bar}>
      <View style={[s.barLong, { width: `${longPct}%` as any }]} />
      <View style={[s.barShort, { width: `${100 - longPct}%` as any }]} />
    </View>
  );
}

/* ─── Sentiment Card ─── */

function SentCard({ d }: { d: SentimentData }) {
  const meta = INSTRUMENT_META[d.symbol as Instrument] ?? { label: "??", color: "#888" };

  return (
    <View style={s.card}>
      {/* Pair header */}
      <View style={s.pairRow}>
        <View style={[s.pairIcon, { backgroundColor: meta.color }]}>
          <Text style={s.pairIconText}>{meta.label}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.pairName}>{d.symbol}</Text>
          <Text style={s.pairPrice}>
            {d.price}{" "}
            <Text style={{ color: d.price_change_up ? colors.limeDim : colors.red, fontFamily: fontFamily.mono.medium }}>
              {d.price_change}
            </Text>
          </Text>
        </View>
        <Text style={s.positionsText}>{d.positions} pos</Text>
      </View>

      <SentimentGauge longPct={d.long_pct} />
      <SentBar longPct={d.long_pct} />

      <View style={s.barLabels}>
        <Text style={[s.barLabel, { color: colors.limeDim }]}>
          {Math.round(d.long_pct)}% Long
        </Text>
        <Text style={[s.barLabel, { color: colors.red }]}>
          {Math.round(d.short_pct)}% Short
        </Text>
      </View>
    </View>
  );
}

/* ─── Heatmap Cell ─── */

function getHeatBg(longPct: number): string {
  const intensity = Math.abs(longPct - 50) / 50;
  if (longPct > 65) return `rgba(168,255,57,${0.15 + intensity * 0.4})`;
  if (longPct > 55) return `rgba(168,255,57,${0.05 + intensity * 0.2})`;
  if (longPct > 45) return colors.g50;
  if (longPct > 35) return `rgba(255,68,68,${0.05 + intensity * 0.2})`;
  return `rgba(255,68,68,${0.15 + intensity * 0.4})`;
}

function HeatCell({ d }: { d: SentimentData }) {
  const isLong = d.long_pct >= 50;
  const pct = isLong ? Math.round(d.long_pct) : Math.round(d.short_pct);
  const clr = isLong ? colors.limeDim : colors.red;
  const cellW = (SCREEN_W - 32 - 16) / 3; // 3-col with gaps

  return (
    <View style={[s.heatCell, { backgroundColor: getHeatBg(d.long_pct), width: cellW }]}>
      <Text style={s.heatSym}>{d.symbol}</Text>
      <Text style={[s.heatPct, { color: clr }]}>{pct}%</Text>
      <Text style={[s.heatDir, { color: clr }]}>{isLong ? "LONG" : "SHORT"}</Text>
    </View>
  );
}

/* ─── History Chart (SVG) ─── */

function HistoryChart({ data }: { data: SentimentHistory[] }) {
  if (!data.length) return null;
  const W = SCREEN_W - 32;
  const H = 140;
  const pad = 4;
  const step = data.length > 1 ? (W - 2 * pad) / (data.length - 1) : 0;

  const longLine = data
    .map((d, i) => {
      const x = pad + i * step;
      const y = H - (d.long_pct / 100) * H;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  const longArea = longLine + ` L${W - pad},${H} L${pad},${H} Z`;

  return (
    <View style={[s.chartWrap, { height: H }]}>
      {/* 50% line */}
      <View style={s.chartMidLine} />
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Path d={longArea} fill="rgba(168,255,57,0.12)" />
        <Path d={longLine} fill="none" stroke={colors.lime} strokeWidth={2} />
      </Svg>
    </View>
  );
}

/* ─── Tab Pill ─── */

function TabPill({
  label,
  active,
  onPress,
  small,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  small?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        s.tabPill,
        active && s.tabPillActive,
        small && { paddingHorizontal: 10, paddingVertical: 5 },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text
        style={[
          s.tabPillText,
          active && s.tabPillTextActive,
          small && { fontSize: 11 },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ─── Main Screen ─── */

export default function SentimentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("overview");
  const [assetClass, setAssetClass] = useState<AssetClass | undefined>(undefined);
  const [period, setPeriod] = useState("LIVE");
  const [historySymbol, setHistorySymbol] = useState("XAUUSD");
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>("1W");
  const [refreshing, setRefreshing] = useState(false);

  const { data: sentiments, isLoading, refetch } = useSentiments(supabase, assetClass);
  const { data: hero } = useSentimentHero(supabase);
  const { data: allSentiments } = useSentiments(supabase);
  const { data: allHistory } = useSentimentHistory(supabase, historySymbol, 24);
  const { data: history } = useSentimentHistory(supabase, historySymbol, 24);

  const movers = useMemo(
    () => (allSentiments && allHistory ? computeMovers(allSentiments, allHistory) : { bulls: [], bears: [] }),
    [allSentiments, allHistory],
  );
  const extremes = useMemo(
    () => (allSentiments ? computeExtremes(allSentiments) : []),
    [allSentiments],
  );
  const divergences = useMemo(
    () => (allSentiments ? computeDivergences(allSentiments) : []),
    [allSentiments],
  );

  // Strongest conviction
  const strongLong = useMemo(
    () => (sentiments ?? []).filter((s) => s.long_pct >= 50).sort((a, b) => b.long_pct - a.long_pct).slice(0, 5),
    [sentiments],
  );
  const strongShort = useMemo(
    () => (sentiments ?? []).filter((s) => s.short_pct > 50).sort((a, b) => b.short_pct - a.short_pct).slice(0, 5),
    [sentiments],
  );

  // History stats
  const historyStats = useMemo(() => {
    if (!history?.length) return null;
    const current = history[history.length - 1];
    const avg = Math.round(history.reduce((sum, h) => sum + h.long_pct, 0) / history.length);
    const trend = Math.round(current.long_pct - history[0].long_pct);
    const peakLong = history.reduce((max, h) => (h.long_pct > max.long_pct ? h : max), history[0]);
    const peakShort = history.reduce((max, h) => (h.short_pct > max.short_pct ? h : max), history[0]);
    return { current, avg, trend, peakLong, peakShort };
  }, [history]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <IconArrow size={16} color={colors.black} />
          </View>
        </TouchableOpacity>
        <Text style={s.title}>Market Sentiments</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tab Switcher */}
      <View style={s.tabRow}>
        {TABS.map((t) => (
          <TabPill
            key={t.key}
            label={t.label}
            active={tab === t.key}
            onPress={() => setTab(t.key)}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={{ gap: 12 }}>
            <Skeleton width="100%" height={90} radius={12} />
            <Skeleton width="100%" height={90} radius={12} />
            <Skeleton width="100%" height={200} radius={12} />
          </View>
        ) : !sentiments?.length ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>No sentiment data available yet.</Text>
          </View>
        ) : (
          <>
            {/* ═══ OVERVIEW ═══ */}
            {tab === "overview" && (
              <>
                {/* Hero Stats */}
                {hero && (
                  <View style={{ gap: 10, marginBottom: 20 }}>
                    <View style={s.heroCard}>
                      <Text style={[s.heroVal, { color: colors.lime }]}>
                        {hero.community_bullish_pct}%
                      </Text>
                      <Text style={s.heroLabel}>COMMUNITY BULLISH</Text>
                      <Text style={s.heroSub}>
                        Based on {hero.total_traders.toLocaleString()} positions
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View style={[s.heroCard, { flex: 1 }]}>
                        <Text style={s.heroVal}>{hero.total_traders.toLocaleString()}</Text>
                        <Text style={s.heroLabel}>POSITIONED</Text>
                      </View>
                      <View style={[s.heroCard, { flex: 1 }]}>
                        <Text style={[s.heroVal, { color: colors.lime, fontSize: 22 }]}>
                          {hero.most_traded_symbol}
                        </Text>
                        <Text style={s.heroLabel}>MOST TRADED</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Asset Class Filter */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 14 }}
                  contentContainerStyle={{ gap: 6 }}
                >
                  {ASSET_TABS.map((t) => (
                    <TabPill
                      key={t.key}
                      label={t.label}
                      active={t.key === "all" ? !assetClass : assetClass === t.key}
                      onPress={() => setAssetClass(t.key === "all" ? undefined : (t.key as AssetClass))}
                      small
                    />
                  ))}
                </ScrollView>

                {/* Sentiment Cards */}
                {sentiments.map((d) => (
                  <SentCard key={d.symbol} d={d} />
                ))}

                {/* Movers */}
                <View style={s.sectionHeader}>
                  <Text style={{ fontSize: 18 }}>📈</Text>
                  <Text style={s.sectionTitle}>Biggest Bull Shifts</Text>
                </View>
                {movers.bulls.length === 0 ? (
                  <Text style={s.mutedText}>No significant bull shifts</Text>
                ) : (
                  movers.bulls.map((m) => {
                    const meta = INSTRUMENT_META[m.symbol as Instrument];
                    return (
                      <View style={s.moverItem} key={m.symbol}>
                        <View style={[s.moverDot, { backgroundColor: meta?.color ?? "#888" }]} />
                        <Text style={s.moverSym}>{m.symbol}</Text>
                        <View style={{ flex: 1 }} />
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={[s.moverShift, { color: colors.limeDim }]}>
                            +{Math.round(m.shift)}%
                          </Text>
                          <Text style={s.moverRange}>{m.from_pct}% → {m.to_pct}%</Text>
                        </View>
                      </View>
                    );
                  })
                )}

                <View style={[s.sectionHeader, { marginTop: 16 }]}>
                  <Text style={{ fontSize: 18 }}>📉</Text>
                  <Text style={s.sectionTitle}>Biggest Bear Shifts</Text>
                </View>
                {movers.bears.length === 0 ? (
                  <Text style={s.mutedText}>No significant bear shifts</Text>
                ) : (
                  movers.bears.map((m) => {
                    const meta = INSTRUMENT_META[m.symbol as Instrument];
                    return (
                      <View style={s.moverItem} key={m.symbol}>
                        <View style={[s.moverDot, { backgroundColor: meta?.color ?? "#888" }]} />
                        <Text style={s.moverSym}>{m.symbol}</Text>
                        <View style={{ flex: 1 }} />
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={[s.moverShift, { color: colors.red }]}>
                            +{Math.round(m.shift)}%
                          </Text>
                          <Text style={s.moverRange}>{m.from_pct}% → {m.to_pct}%</Text>
                        </View>
                      </View>
                    );
                  })
                )}

                {/* Extreme Readings */}
                {extremes.length > 0 && (
                  <View style={s.extremeBox}>
                    <View style={s.sectionHeader}>
                      <Text style={{ fontSize: 18 }}>⚠️</Text>
                      <View>
                        <Text style={s.sectionTitle}>Extreme Readings</Text>
                        <Text style={s.mutedText}>
                          Sentiment &gt;70/30 — potential reversal signals
                        </Text>
                      </View>
                    </View>
                    <View style={s.extremeWrap}>
                      {extremes.map((e) => {
                        const isLong = e.side === "LONG";
                        return (
                          <View
                            key={e.symbol}
                            style={[
                              s.extremePill,
                              {
                                backgroundColor: isLong
                                  ? "rgba(168,255,57,0.1)"
                                  : "rgba(255,68,68,0.1)",
                                borderColor: isLong
                                  ? "rgba(168,255,57,0.3)"
                                  : "rgba(255,68,68,0.3)",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                s.extremePillText,
                                { color: isLong ? colors.limeDim : colors.red },
                              ]}
                            >
                              {e.symbol} {e.pct}% {e.side}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Divergences */}
                {divergences.length > 0 && (
                  <View style={s.divBox}>
                    <View style={s.sectionHeader}>
                      <Text style={{ fontSize: 18 }}>🔀</Text>
                      <View>
                        <Text style={s.sectionTitle}>Sentiment vs Price Divergence</Text>
                        <Text style={s.mutedText}>
                          Contradicting price action — potential signal
                        </Text>
                      </View>
                    </View>
                    {divergences.map((d) => (
                      <View key={d.symbol} style={s.divCard}>
                        <Text style={s.divSym}>{d.symbol}</Text>
                        <View style={s.divRow}>
                          <Text style={s.divLabel}>Price</Text>
                          <Text
                            style={[
                              s.divValue,
                              {
                                color: d.price_change.startsWith("+")
                                  ? colors.limeDim
                                  : colors.red,
                              },
                            ]}
                          >
                            {d.price_change}
                          </Text>
                        </View>
                        <View style={s.divRow}>
                          <Text style={s.divLabel}>Sentiment</Text>
                          <Text style={s.divValue}>{d.sentiment_pct}</Text>
                        </View>
                        <View
                          style={[
                            s.divSignal,
                            {
                              backgroundColor: d.bullish
                                ? "rgba(168,255,57,0.1)"
                                : "rgba(255,68,68,0.1)",
                              borderColor: d.bullish
                                ? "rgba(168,255,57,0.25)"
                                : "rgba(255,68,68,0.25)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              s.divSignalText,
                              { color: d.bullish ? colors.limeDim : colors.red },
                            ]}
                          >
                            {d.signal}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* ═══ HEATMAP ═══ */}
            {tab === "heatmap" && (
              <>
                {/* Asset filter */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 14 }}
                  contentContainerStyle={{ gap: 6 }}
                >
                  {ASSET_TABS.map((t) => (
                    <TabPill
                      key={t.key}
                      label={t.label}
                      active={t.key === "all" ? !assetClass : assetClass === t.key}
                      onPress={() => setAssetClass(t.key === "all" ? undefined : (t.key as AssetClass))}
                      small
                    />
                  ))}
                </ScrollView>

                {/* Legend */}
                <View style={s.legendRow}>
                  {[
                    { label: "Long", bg: colors.lime },
                    { label: "Neutral", bg: colors.g200 },
                    { label: "Short", bg: colors.red },
                  ].map((l) => (
                    <View key={l.label} style={s.legendItem}>
                      <View style={[s.legendSwatch, { backgroundColor: l.bg }]} />
                      <Text style={s.legendText}>{l.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Heatmap Grid (3-col) */}
                <View style={s.heatGrid}>
                  {sentiments.map((d) => (
                    <HeatCell key={d.symbol} d={d} />
                  ))}
                </View>

                {/* Strongest Long */}
                <View style={s.convictionCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <View style={[s.convDot, { backgroundColor: colors.lime }]} />
                    <Text style={s.convTitle}>Strongest Long Conviction</Text>
                  </View>
                  {strongLong.map((d, i) => (
                    <View
                      key={d.symbol}
                      style={[
                        s.convRow,
                        i < strongLong.length - 1 && s.convRowBorder,
                      ]}
                    >
                      <Text style={s.convRank}>#{i + 1}</Text>
                      <Text style={s.convSym}>{d.symbol}</Text>
                      <Text style={s.convTraders}>{d.positions}</Text>
                      <Text style={[s.convPct, { color: colors.limeDim }]}>
                        {Math.round(d.long_pct)}%
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Strongest Short */}
                <View style={s.convictionCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <View style={[s.convDot, { backgroundColor: colors.red }]} />
                    <Text style={s.convTitle}>Strongest Short Conviction</Text>
                  </View>
                  {strongShort.map((d, i) => (
                    <View
                      key={d.symbol}
                      style={[
                        s.convRow,
                        i < strongShort.length - 1 && s.convRowBorder,
                      ]}
                    >
                      <Text style={s.convRank}>#{i + 1}</Text>
                      <Text style={s.convSym}>{d.symbol}</Text>
                      <Text style={s.convTraders}>{d.positions}</Text>
                      <Text style={[s.convPct, { color: colors.red }]}>
                        {Math.round(d.short_pct)}%
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* ═══ HISTORY ═══ */}
            {tab === "history" && (
              <>
                {/* Symbol selector */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 10 }}
                  contentContainerStyle={{ gap: 6 }}
                >
                  {allInstruments.map((sym) => (
                    <TabPill
                      key={sym}
                      label={sym}
                      active={historySymbol === sym}
                      onPress={() => setHistorySymbol(sym)}
                      small
                    />
                  ))}
                </ScrollView>

                {/* Period filter */}
                <View style={{ flexDirection: "row", gap: 6, marginBottom: 16 }}>
                  {HISTORY_PERIODS.map((p) => (
                    <TabPill
                      key={p}
                      label={p}
                      active={historyPeriod === p}
                      onPress={() => setHistoryPeriod(p)}
                      small
                    />
                  ))}
                </View>

                {/* Stats */}
                {historyStats && (
                  <View style={s.statsCard}>
                    <View style={s.statsRow}>
                      <View style={s.statItem}>
                        <Text style={s.statLabel}>Current</Text>
                        <Text style={[s.statVal, { color: colors.limeDim }]}>
                          {Math.round(historyStats.current.long_pct)}% Long
                        </Text>
                      </View>
                      <View style={s.statItem}>
                        <Text style={s.statLabel}>Avg</Text>
                        <Text style={s.statVal}>{historyStats.avg}%</Text>
                      </View>
                      <View style={s.statItem}>
                        <Text style={s.statLabel}>Trend</Text>
                        <Text
                          style={[
                            s.statVal,
                            {
                              color:
                                historyStats.trend >= 0 ? colors.limeDim : colors.red,
                            },
                          ]}
                        >
                          {historyStats.trend >= 0 ? "↑+" : "↓"}
                          {historyStats.trend}%
                        </Text>
                      </View>
                    </View>

                    {/* Chart */}
                    <HistoryChart data={history ?? []} />
                  </View>
                )}

                {/* Hourly Snapshots */}
                {history && history.length > 0 && (
                  <View style={s.histTable}>
                    <View style={s.histHeader}>
                      <Text style={s.histHeaderTitle}>Hourly Snapshots</Text>
                      <Text style={s.histHeaderSub}>
                        {history.length}h · {historySymbol}
                      </Text>
                    </View>

                    {/* Column headers */}
                    <View style={s.histRow}>
                      <Text style={[s.histColTime, s.histColLabel]}>Time</Text>
                      <View style={s.histColBar}>
                        <Text style={s.histColLabel}>Bar</Text>
                      </View>
                      <Text style={[s.histColPct, s.histColLabel]}>Long</Text>
                      <Text style={[s.histColPct, s.histColLabel]}>Short</Text>
                      <Text style={[s.histColPct, s.histColLabel]}>Chg</Text>
                    </View>

                    {[...history].reverse().map((h, i, arr) => {
                      const prev = arr[i + 1];
                      const change = prev ? Math.round(h.long_pct - prev.long_pct) : 0;
                      const changeStr = change > 0 ? `+${change}%` : change < 0 ? `${change}%` : "0%";
                      const timeLabel = i === 0 ? "Now" : `${i}h ago`;

                      return (
                        <View key={h.id} style={[s.histRow, s.histRowData]}>
                          <Text style={s.histTime}>{timeLabel}</Text>
                          <View style={s.histColBar}>
                            <View style={s.histBarBg}>
                              <View
                                style={[
                                  s.histBarLong,
                                  { width: `${h.long_pct}%` as any },
                                ]}
                              />
                              <View
                                style={[
                                  s.histBarShort,
                                  { width: `${h.short_pct}%` as any },
                                ]}
                              />
                            </View>
                          </View>
                          <Text style={[s.histPct, { color: colors.limeDim }]}>
                            {Math.round(h.long_pct)}%
                          </Text>
                          <Text style={[s.histPct, { color: colors.red }]}>
                            {Math.round(h.short_pct)}%
                          </Text>
                          <Text
                            style={[
                              s.histPct,
                              {
                                color: changeStr.startsWith("+")
                                  ? colors.limeDim
                                  : changeStr.startsWith("-")
                                    ? colors.red
                                    : colors.g400,
                              },
                            ]}
                          >
                            {changeStr}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* ─── Styles ─── */

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
    backgroundColor: colors.white,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.g50,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: fontFamily.sans.extrabold,
    fontSize: 18,
    color: colors.black,
    letterSpacing: -0.5,
  },
  tabRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.g50,
    borderWidth: 1,
    borderColor: colors.g200,
  },
  tabPillActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  tabPillText: {
    fontFamily: fontFamily.sans.semibold,
    fontSize: 13,
    color: colors.g500,
  },
  tabPillTextActive: {
    color: colors.white,
  },
  scroll: {
    padding: 16,
    paddingBottom: 100,
  },
  empty: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: fontFamily.sans.medium,
    fontSize: 14,
    color: colors.g400,
  },

  /* Hero */
  heroCard: {
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.white,
    alignItems: "center",
  },
  heroVal: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 30,
    fontWeight: "900",
    color: colors.black,
    letterSpacing: -2,
  },
  heroLabel: {
    fontFamily: fontFamily.sans.semibold,
    fontSize: 10,
    color: colors.g400,
    letterSpacing: 1,
    marginTop: 2,
  },
  heroSub: {
    fontFamily: fontFamily.sans.regular,
    fontSize: 11,
    color: colors.g400,
    marginTop: 4,
  },

  /* Card */
  card: {
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: colors.white,
  },
  pairRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  pairIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  pairIconText: {
    fontFamily: fontFamily.sans.extrabold,
    fontSize: 10,
    color: colors.white,
  },
  pairName: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 14,
    fontWeight: "800",
    color: colors.black,
  },
  pairPrice: {
    fontFamily: fontFamily.mono.regular,
    fontSize: 11,
    color: colors.g400,
  },
  positionsText: {
    fontFamily: fontFamily.sans.regular,
    fontSize: 10,
    color: colors.g400,
  },

  /* Bar */
  bar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.g100,
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 6,
  },
  barLong: {
    height: "100%",
    backgroundColor: colors.lime,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  barShort: {
    height: "100%",
    backgroundColor: colors.red,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  barLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  barLabel: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 11,
    fontWeight: "700",
  },

  /* Movers */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: fontFamily.sans.extrabold,
    fontSize: 14,
    color: colors.black,
  },
  mutedText: {
    fontFamily: fontFamily.sans.regular,
    fontSize: 11,
    color: colors.g400,
  },
  moverItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  moverDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  moverSym: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 13,
    fontWeight: "700",
    color: colors.black,
  },
  moverShift: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 14,
    fontWeight: "800",
  },
  moverRange: {
    fontFamily: fontFamily.sans.regular,
    fontSize: 10,
    color: colors.g400,
  },

  /* Extreme */
  extremeBox: {
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
  },
  extremeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  extremePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  extremePillText: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 10,
    fontWeight: "700",
  },

  /* Divergence */
  divBox: {
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  divCard: {
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  divSym: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 14,
    fontWeight: "800",
    color: colors.black,
    marginBottom: 6,
  },
  divRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  divLabel: {
    fontFamily: fontFamily.sans.regular,
    fontSize: 11,
    color: colors.g400,
  },
  divValue: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 12,
    fontWeight: "700",
    color: colors.black,
  },
  divSignal: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  divSignalText: {
    fontFamily: fontFamily.sans.bold,
    fontSize: 10,
    fontWeight: "700",
  },

  /* Heatmap */
  heatGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  heatCell: {
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.g200,
  },
  heatSym: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 11,
    fontWeight: "800",
    color: colors.black,
    marginBottom: 2,
  },
  heatPct: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 18,
    fontWeight: "900",
  },
  heatDir: {
    fontFamily: fontFamily.sans.bold,
    fontSize: 8,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  /* Legend */
  legendRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontFamily: fontFamily.sans.regular,
    fontSize: 11,
    color: colors.g500,
  },

  /* Conviction */
  convictionCard: {
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  convDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  convTitle: {
    fontFamily: fontFamily.sans.extrabold,
    fontSize: 13,
    color: colors.black,
  },
  convRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  convRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  convRank: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 12,
    fontWeight: "800",
    color: colors.g300,
    width: 24,
  },
  convSym: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 13,
    fontWeight: "700",
    color: colors.black,
    flex: 1,
  },
  convTraders: {
    fontFamily: fontFamily.sans.regular,
    fontSize: 11,
    color: colors.g400,
  },
  convPct: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 14,
    fontWeight: "800",
  },

  /* History stats */
  statsCard: {
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontFamily: fontFamily.sans.regular,
    fontSize: 10,
    color: colors.g400,
    marginBottom: 2,
  },
  statVal: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 16,
    fontWeight: "800",
    color: colors.black,
  },

  /* Chart */
  chartWrap: {
    backgroundColor: colors.g50,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  chartMidLine: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    borderTopColor: colors.g300,
    borderStyle: "dashed",
    zIndex: 1,
  },

  /* History table */
  histTable: {
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: 16,
    overflow: "hidden",
  },
  histHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
  },
  histHeaderTitle: {
    fontFamily: fontFamily.sans.extrabold,
    fontSize: 14,
    color: colors.black,
  },
  histHeaderSub: {
    fontFamily: fontFamily.sans.regular,
    fontSize: 11,
    color: colors.g400,
  },
  histRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  histRowData: {
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  histColLabel: {
    fontFamily: fontFamily.sans.bold,
    fontSize: 10,
    color: colors.g400,
    textTransform: "uppercase",
  },
  histColTime: {
    width: 60,
  },
  histColBar: {
    flex: 1,
    paddingHorizontal: 6,
  },
  histColPct: {
    width: 50,
    textAlign: "center",
  },
  histTime: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 11,
    fontWeight: "600",
    color: colors.black,
    width: 60,
  },
  histBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.g100,
    flexDirection: "row",
    overflow: "hidden",
  },
  histBarLong: {
    height: "100%",
    backgroundColor: colors.lime,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  histBarShort: {
    height: "100%",
    backgroundColor: colors.red,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  histPct: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 12,
    fontWeight: "700",
    width: 50,
    textAlign: "center",
  },
});
