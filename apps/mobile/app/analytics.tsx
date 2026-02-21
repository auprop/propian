import { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Polyline, Line, Polygon, Defs, LinearGradient, Stop } from "react-native-svg";
import { supabase } from "@/lib/supabase";
import {
  useTradeStats,
  useEquityCurve,
  usePortfolioSummary,
  usePairBreakdown,
  useDayOfWeekStats,
  useDirectionStats,
  useEmotionStats,
  useSetupStats,
  useMistakeStats,
  useDrawdownCurve,
  useWeeklyPnl,
  useRiskRewardDistribution,
} from "@propian/shared/hooks";
import type {
  DayOfWeekStats,
  DirectionStats,
  EmotionStats,
  SetupStats,
  MistakeStats,
  DrawdownPoint,
  WeeklyPnl,
  RiskRewardBucket,
  EquityCurvePoint,
  PairBreakdown,
} from "@propian/shared/types";
import { formatCurrency } from "@propian/shared/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { IconChevLeft } from "@/components/icons/IconChevLeft";
import { colors, fontFamily, radii } from "@/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;

/* ─── Helpers ─── */

function pnlColor(val: number) {
  return val > 0 ? colors.green : val < 0 ? colors.red : colors.g400;
}

function pnlSign(val: number) {
  return val > 0 ? "+" : "";
}

const EMOTION_EMOJI: Record<string, string> = {
  confident: "😎",
  neutral: "😐",
  fearful: "😰",
  greedy: "🤑",
  revenge: "😡",
};

/* ─── Stat Card ─── */

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.statCard as ViewStyle}>
      <Text style={[s.statValue as TextStyle, color ? { color } : undefined]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={s.statLabel as TextStyle} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/* ─── Equity Curve + Drawdown ─── */

function EquityCurveCard({ data, ddData }: { data: EquityCurvePoint[]; ddData: DrawdownPoint[] }) {
  const chartWidth = SCREEN_WIDTH - 32;
  const eqHeight = 140;
  const ddHeight = 50;

  const eq = useMemo(() => {
    if (data.length < 2) return null;
    const pad = { top: 8, right: 8, bottom: 8, left: 8 };
    const values = data.map((d) => d.cumulative_pnl);
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const range = max - min || 1;

    const pts = data
      .map((d, i) => {
        const x = pad.left + (i / (data.length - 1)) * (chartWidth - pad.left - pad.right);
        const y = pad.top + (1 - (d.cumulative_pnl - min) / range) * (eqHeight - pad.top - pad.bottom);
        return `${x},${y}`;
      })
      .join(" ");

    const zy = pad.top + (1 - (0 - min) / range) * (eqHeight - pad.top - pad.bottom);
    return { points: pts, zeroY: zy };
  }, [data, chartWidth]);

  const dd = useMemo(() => {
    if (ddData.length < 2) return null;
    const maxDD = Math.max(...ddData.map((d) => d.drawdown), 1);
    const pts = ddData
      .map((d, i) => {
        const x = 8 + (i / (ddData.length - 1)) * (chartWidth - 16);
        const y = 4 + (d.drawdown / maxDD) * (ddHeight - 8);
        return `${x},${y}`;
      })
      .join(" ");
    return { points: pts };
  }, [ddData, chartWidth]);

  if (!eq) {
    return (
      <View style={s.card as ViewStyle}>
        <Text style={s.cardTitle as TextStyle}>EQUITY CURVE</Text>
        <Text style={s.emptyText as TextStyle}>Need at least 2 closed trading days</Text>
      </View>
    );
  }

  const lastPnl = data[data.length - 1]?.cumulative_pnl ?? 0;
  const curveColor = lastPnl >= 0 ? colors.green : colors.red;

  return (
    <View style={s.card as ViewStyle}>
      <View style={s.cardHeader as ViewStyle}>
        <Text style={s.cardTitle as TextStyle}>EQUITY CURVE</Text>
        <Text style={[s.cardHeaderVal as TextStyle, { color: pnlColor(lastPnl) }]}>
          {`${pnlSign(lastPnl)}${formatCurrency(lastPnl)}`}
        </Text>
      </View>
      <Svg width={chartWidth} height={eqHeight}>
        <Defs>
          <LinearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={curveColor} stopOpacity="0.2" />
            <Stop offset="100%" stopColor={curveColor} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        <Line x1={8} y1={eq.zeroY} x2={chartWidth - 8} y2={eq.zeroY} stroke={colors.g200} strokeWidth={1} strokeDasharray="4 4" />
        <Polygon points={`8,${eq.zeroY} ${eq.points} ${chartWidth - 8},${eq.zeroY}`} fill="url(#eqGrad)" />
        <Polyline points={eq.points} fill="none" stroke={curveColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>

      {dd && (
        <>
          <Text style={[s.cardTitle as TextStyle, { marginTop: 4, marginBottom: 4, fontSize: 10 }]}>DRAWDOWN</Text>
          <Svg width={chartWidth} height={ddHeight}>
            <Defs>
              <LinearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={colors.red} stopOpacity="0.2" />
                <Stop offset="100%" stopColor={colors.red} stopOpacity="0.02" />
              </LinearGradient>
            </Defs>
            <Polygon points={`8,0 ${dd.points} ${chartWidth - 8},0`} fill="url(#ddGrad)" />
            <Polyline points={dd.points} fill="none" stroke={colors.red} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </>
      )}
    </View>
  );
}

/* ─── Day of Week ─── */

function DayOfWeekCard({ data }: { data: DayOfWeekStats[] }) {
  const weekdays = [1, 2, 3, 4, 5].map(
    (d) =>
      data.find((x) => x.day === d) ?? {
        day: d,
        day_name: ["", "Mon", "Tue", "Wed", "Thu", "Fri"][d],
        trade_count: 0,
        win_count: 0,
        win_rate: 0,
        total_pnl: 0,
        avg_pnl: 0,
      }
  );
  const maxPnl = Math.max(...weekdays.map((d) => Math.abs(d.total_pnl)), 1);

  return (
    <View style={s.card as ViewStyle}>
      <Text style={s.cardTitle as TextStyle}>P&L BY DAY OF WEEK</Text>
      <View style={{ flexDirection: "row", gap: 6, alignItems: "flex-end", height: 120 }}>
        {weekdays.map((d) => {
          const barH = maxPnl > 0 ? (Math.abs(d.total_pnl) / maxPnl) * 80 : 0;
          return (
            <View key={d.day} style={{ flex: 1, alignItems: "center", gap: 3 }}>
              <Text style={[s.miniMono as TextStyle, { color: pnlColor(d.total_pnl) }]}>
                {d.trade_count > 0 ? `${pnlSign(d.total_pnl)}${formatCurrency(d.total_pnl)}` : ""}
              </Text>
              <View
                style={{
                  width: "80%",
                  height: Math.max(barH, 4),
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  backgroundColor: d.total_pnl >= 0 ? colors.lime : colors.red,
                  opacity: d.trade_count === 0 ? 0.15 : 1,
                }}
              />
              <Text style={s.miniLabel as TextStyle}>{d.day_name.slice(0, 3)}</Text>
              <Text style={s.miniMeta as TextStyle}>
                {d.trade_count > 0 ? `${d.win_rate.toFixed(0)}%` : "\u2014"}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ─── Weekly P&L ─── */

function WeeklyPnlCard({ data }: { data: WeeklyPnl[] }) {
  const recent = data.slice(-8);
  if (recent.length === 0) {
    return (
      <View style={s.card as ViewStyle}>
        <Text style={s.cardTitle as TextStyle}>WEEKLY P&L</Text>
        <Text style={s.emptyText as TextStyle}>No weekly data yet</Text>
      </View>
    );
  }

  const maxPnl = Math.max(...recent.map((w) => Math.abs(w.pnl)), 1);

  return (
    <View style={s.card as ViewStyle}>
      <Text style={s.cardTitle as TextStyle}>WEEKLY P&L</Text>
      <View style={{ flexDirection: "row", gap: 4, alignItems: "flex-end", height: 110 }}>
        {recent.map((w) => {
          const barH = maxPnl > 0 ? (Math.abs(w.pnl) / maxPnl) * 70 : 0;
          return (
            <View key={w.week_start} style={{ flex: 1, alignItems: "center", gap: 3 }}>
              <Text style={[s.miniMono as TextStyle, { color: pnlColor(w.pnl), fontSize: 8 }]}>
                {pnlSign(w.pnl)}{formatCurrency(w.pnl)}
              </Text>
              <View
                style={{
                  width: "80%",
                  height: Math.max(barH, 4),
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  backgroundColor: w.pnl >= 0 ? colors.lime : colors.red,
                }}
              />
              <Text style={[s.miniMeta as TextStyle, { fontSize: 8 }]}>{w.week_start.slice(5)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ─── Direction Breakdown ─── */

function DirectionCard({ data }: { data: DirectionStats[] }) {
  const longD = data.find((d) => d.direction === "long");
  const shortD = data.find((d) => d.direction === "short");
  const total = (longD?.trade_count ?? 0) + (shortD?.trade_count ?? 0);
  if (total === 0) {
    return (
      <View style={s.card as ViewStyle}>
        <Text style={s.cardTitle as TextStyle}>LONG VS SHORT</Text>
        <Text style={s.emptyText as TextStyle}>No direction data</Text>
      </View>
    );
  }

  const longPct = total > 0 ? ((longD?.trade_count ?? 0) / total) * 100 : 50;

  return (
    <View style={s.card as ViewStyle}>
      <Text style={s.cardTitle as TextStyle}>LONG VS SHORT</Text>
      {/* Bar */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Text style={[s.miniMono as TextStyle, { color: colors.green, fontWeight: "700" }]}>{longPct.toFixed(0)}%</Text>
        <View style={{ flex: 1, height: 10, borderRadius: 5, overflow: "hidden", flexDirection: "row", borderWidth: 1, borderColor: colors.g200 }}>
          <View style={{ width: `${longPct}%`, backgroundColor: colors.green, height: "100%" } as ViewStyle} />
          <View style={{ width: `${100 - longPct}%`, backgroundColor: colors.red, height: "100%" } as ViewStyle} />
        </View>
        <Text style={[s.miniMono as TextStyle, { color: colors.red, fontWeight: "700" }]}>{(100 - longPct).toFixed(0)}%</Text>
      </View>
      {/* Details */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        {[
          { label: "LONG", d: longD, clr: colors.green },
          { label: "SHORT", d: shortD, clr: colors.red },
        ].map(({ label, d, clr }) => (
          <View key={label} style={{ flex: 1, borderLeftWidth: 3, borderLeftColor: clr, paddingLeft: 10 }}>
            <Text style={[s.miniLabel as TextStyle, { color: clr, marginBottom: 4, fontWeight: "700" }]}>{label}</Text>
            <Text style={[s.miniMeta as TextStyle, { fontSize: 11 }]}>{d?.trade_count ?? 0} trades</Text>
            <Text style={[s.miniMeta as TextStyle, { fontSize: 11 }]}>{(d?.win_rate ?? 0).toFixed(1)}% WR</Text>
            <Text style={[s.miniMono as TextStyle, { color: pnlColor(d?.total_pnl ?? 0), marginTop: 2 }]}>
              {pnlSign(d?.total_pnl ?? 0)}{formatCurrency(d?.total_pnl ?? 0)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ─── Emotion Analysis ─── */

function EmotionCard({ data }: { data: EmotionStats[] }) {
  if (data.length === 0) {
    return (
      <View style={s.card as ViewStyle}>
        <Text style={s.cardTitle as TextStyle}>EMOTION ANALYSIS</Text>
        <Text style={s.emptyText as TextStyle}>Log emotions to see breakdown</Text>
      </View>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.trade_count), 1);

  return (
    <View style={s.card as ViewStyle}>
      <Text style={s.cardTitle as TextStyle}>EMOTION ANALYSIS</Text>
      {data.map((e) => (
        <View key={e.emotion} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 }}>
          <Text style={{ fontSize: 18 }}>{EMOTION_EMOJI[e.emotion] ?? "❓"}</Text>
          <Text style={[s.miniLabel as TextStyle, { minWidth: 60, textTransform: "capitalize", fontSize: 12 }]}>{e.emotion}</Text>
          <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.g100, overflow: "hidden" }}>
            <View
              style={{
                width: `${(e.trade_count / maxCount) * 100}%`,
                height: "100%",
                borderRadius: 3,
                backgroundColor: e.total_pnl >= 0 ? colors.lime : colors.red,
              } as ViewStyle}
            />
          </View>
          <Text style={[s.miniMeta as TextStyle, { minWidth: 28, textAlign: "right" }]}>{e.win_rate.toFixed(0)}%</Text>
          <Text style={[s.miniMono as TextStyle, { color: pnlColor(e.total_pnl), minWidth: 55, textAlign: "right" }]}>
            {pnlSign(e.total_pnl)}{formatCurrency(e.total_pnl)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ─── Pair Performance ─── */

function PairCard({ data }: { data: PairBreakdown[] }) {
  if (data.length === 0) {
    return (
      <View style={s.card as ViewStyle}>
        <Text style={s.cardTitle as TextStyle}>PAIR PERFORMANCE</Text>
        <Text style={s.emptyText as TextStyle}>No closed trades yet</Text>
      </View>
    );
  }

  return (
    <View style={s.card as ViewStyle}>
      <Text style={s.cardTitle as TextStyle}>PAIR PERFORMANCE</Text>
      {data.slice(0, 8).map((p) => (
        <View key={p.pair} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 }}>
          <Text style={[s.miniMono as TextStyle, { fontWeight: "700", minWidth: 65 }]}>{p.pair}</Text>
          <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.g100, overflow: "hidden" }}>
            <View
              style={{
                width: `${p.win_rate}%`,
                height: "100%",
                borderRadius: 3,
                backgroundColor: p.total_pnl >= 0 ? colors.lime : colors.red,
              } as ViewStyle}
            />
          </View>
          <Text style={[s.miniMeta as TextStyle, { minWidth: 28, textAlign: "right" }]}>{p.win_rate.toFixed(0)}%</Text>
          <Text style={[s.miniMono as TextStyle, { color: pnlColor(p.total_pnl), minWidth: 55, textAlign: "right" }]}>
            {pnlSign(p.total_pnl)}{formatCurrency(p.total_pnl)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ─── R:R Distribution ─── */

function RRCard({ data }: { data: RiskRewardBucket[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) {
    return (
      <View style={s.card as ViewStyle}>
        <Text style={s.cardTitle as TextStyle}>R:R DISTRIBUTION</Text>
        <Text style={s.emptyText as TextStyle}>Log R:R on trades to see</Text>
      </View>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <View style={s.card as ViewStyle}>
      <Text style={s.cardTitle as TextStyle}>R:R DISTRIBUTION</Text>
      {data.map((b) => (
        <View key={b.bucket} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 }}>
          <Text style={[s.miniMono as TextStyle, { fontWeight: "700", minWidth: 65, color: colors.g600 }]}>{b.bucket}</Text>
          <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.g100, overflow: "hidden" }}>
            <View
              style={{
                width: `${(b.count / maxCount) * 100}%`,
                height: "100%",
                borderRadius: 4,
                backgroundColor: b.win_rate >= 50 ? colors.lime : colors.red,
                opacity: b.count === 0 ? 0.2 : 1,
              } as ViewStyle}
            />
          </View>
          <Text style={[s.miniMeta as TextStyle, { minWidth: 18, textAlign: "right" }]}>{b.count}</Text>
          <Text style={[s.miniMeta as TextStyle, { minWidth: 28, textAlign: "right" }]}>
            {b.count > 0 ? `${b.win_rate.toFixed(0)}%` : "\u2014"}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ─── Setup & Mistakes ─── */

function SetupCard({ data }: { data: SetupStats[] }) {
  if (data.length === 0) {
    return (
      <View style={s.card as ViewStyle}>
        <Text style={s.cardTitle as TextStyle}>SETUP PERFORMANCE</Text>
        <Text style={s.emptyText as TextStyle}>Log setups to see performance</Text>
      </View>
    );
  }

  return (
    <View style={s.card as ViewStyle}>
      <Text style={s.cardTitle as TextStyle}>SETUP PERFORMANCE</Text>
      {data.slice(0, 6).map((item) => (
        <View key={item.setup} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[s.miniLabel as TextStyle, { fontSize: 12, fontWeight: "600" }]}>{item.setup}</Text>
            <Text style={s.miniMeta as TextStyle}>{item.trade_count}T</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[s.miniMeta as TextStyle, { fontWeight: "700", color: item.win_rate >= 50 ? colors.green : colors.red }]}>
              {item.win_rate.toFixed(0)}%
            </Text>
            <Text style={[s.miniMono as TextStyle, { color: pnlColor(item.total_pnl) }]}>
              {pnlSign(item.total_pnl)}{formatCurrency(item.total_pnl)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function MistakeCard({ data }: { data: MistakeStats[] }) {
  if (data.length === 0) {
    return (
      <View style={s.card as ViewStyle}>
        <Text style={s.cardTitle as TextStyle}>COMMON MISTAKES</Text>
        <Text style={s.emptyText as TextStyle}>Log mistakes to see patterns</Text>
      </View>
    );
  }

  return (
    <View style={s.card as ViewStyle}>
      <Text style={s.cardTitle as TextStyle}>COMMON MISTAKES</Text>
      {data.slice(0, 6).map((item) => (
        <View key={item.mistake} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[s.miniLabel as TextStyle, { fontSize: 12, fontWeight: "600" }]}>{item.mistake}</Text>
            <Text style={s.miniMeta as TextStyle}>{`\u00D7${item.count}`}</Text>
          </View>
          <Text style={[s.miniMono as TextStyle, { color: pnlColor(item.total_pnl) }]}>
            {pnlSign(item.total_pnl)}{formatCurrency(item.total_pnl)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ─── Main Screen ─── */

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: stats, isLoading: statsLoading, refetch, isRefetching } = useTradeStats(supabase);
  const { data: summary } = usePortfolioSummary(supabase);
  const { data: equityCurve } = useEquityCurve(supabase);
  const { data: drawdown } = useDrawdownCurve(supabase);
  const { data: pairBreakdown } = usePairBreakdown(supabase);
  const { data: dayOfWeek } = useDayOfWeekStats(supabase);
  const { data: direction } = useDirectionStats(supabase);
  const { data: emotion } = useEmotionStats(supabase);
  const { data: setups } = useSetupStats(supabase);
  const { data: mistakes } = useMistakeStats(supabase);
  const { data: weeklyPnl } = useWeeklyPnl(supabase);
  const { data: rrDist } = useRiskRewardDistribution(supabase);

  const isEmpty = !statsLoading && (stats?.total_trades ?? 0) === 0;

  return (
    <View style={[s.container as ViewStyle, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header as ViewStyle}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn as ViewStyle}>
          <IconChevLeft size={20} color={colors.black} />
        </TouchableOpacity>
        <Text style={s.headerTitle as TextStyle}>Analytics</Text>
        {stats && !isEmpty ? (
          <Text style={s.headerSub as TextStyle}>{stats.total_trades} trades</Text>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
      >
        {statsLoading ? (
          <View style={{ gap: 12, padding: 16 }}>
            <Skeleton width="100%" height={80} radius={12} />
            <Skeleton width="100%" height={160} radius={12} />
            <Skeleton width="100%" height={120} radius={12} />
          </View>
        ) : isEmpty ? (
          <EmptyState title="No analytics yet" description="Close your first trade in the Journal to see analytics." />
        ) : (
          <>
            {/* Stat cards row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statsRow}>
              <StatCard label="NET P&L" value={`${pnlSign(stats?.total_pnl ?? 0)}${formatCurrency(stats?.total_pnl ?? 0)}`} color={pnlColor(stats?.total_pnl ?? 0)} />
              <StatCard label="WIN RATE" value={`${(stats?.win_rate ?? 0).toFixed(1)}%`} color={(stats?.win_rate ?? 0) >= 50 ? colors.green : colors.red} />
              <StatCard label="PROFIT F." value={(stats?.profit_factor ?? 0) === Infinity ? "\u221E" : (stats?.profit_factor ?? 0).toFixed(2)} />
              <StatCard label="AVG R:R" value={(stats?.avg_rr ?? 0).toFixed(2)} />
              <StatCard label="MAX DD" value={formatCurrency(summary?.max_drawdown ?? 0)} color={colors.red} />
            </ScrollView>

            {/* Cards */}
            <View style={s.cardsContainer}>
              <EquityCurveCard data={equityCurve ?? []} ddData={drawdown ?? []} />
              <WeeklyPnlCard data={weeklyPnl ?? []} />
              <DayOfWeekCard data={dayOfWeek ?? []} />
              <DirectionCard data={direction ?? []} />
              <PairCard data={pairBreakdown ?? []} />
              <EmotionCard data={emotion ?? []} />
              <RRCard data={rrDist ?? []} />
              <SetupCard data={setups ?? []} />
              <MistakeCard data={mistakes ?? []} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* ─── Styles ─── */

const STAT_W = (SCREEN_WIDTH - 32 - 8 * 4) / 3.5;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.g200,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fontFamily.sans.bold,
    color: colors.black,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: fontFamily.sans.medium,
    color: colors.g400,
  },
  scrollContent: { paddingBottom: 100 },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  statCard: {
    width: STAT_W,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 16,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "800",
    color: colors.black,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: fontFamily.sans.semibold,
    color: colors.g400,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 3,
  },
  cardsContainer: { padding: 16, gap: 12 },
  card: {
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    padding: 14,
    overflow: "hidden",
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: fontFamily.sans.bold,
    color: colors.g400,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardHeaderVal: {
    fontSize: 14,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fontFamily.sans.regular,
    color: colors.g400,
    textAlign: "center",
    paddingVertical: 8,
  },
  miniMono: {
    fontSize: 10,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "700",
    color: colors.black,
  },
  miniLabel: {
    fontSize: 10,
    fontFamily: fontFamily.sans.semibold,
    color: colors.g500,
  },
  miniMeta: {
    fontSize: 9,
    fontFamily: fontFamily.sans.regular,
    color: colors.g400,
  },
});
