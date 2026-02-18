import { useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Dimensions,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Polyline, Line, Polygon, Defs, LinearGradient, Stop, Circle } from "react-native-svg";
import { supabase } from "@/lib/supabase";
import {
  usePortfolioSummary,
  useEquityCurve,
  useOpenPositions,
  usePairBreakdown,
  useMonthlyReturns,
  useTradeStats,
} from "@propian/shared/hooks";
import type {
  Trade,
  EquityCurvePoint,
  PairBreakdown,
  MonthlyReturn,
  PortfolioSummary,
} from "@propian/shared/types";
import { formatCurrency } from "@propian/shared/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { IconSuitcase } from "@/components/icons/IconSuitcase";
import { colors, fontFamily, radii, spacing } from "@/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;

/* ─── Helpers ─── */

function pnlColor(val: number) {
  return val > 0 ? colors.green : val < 0 ? colors.red : colors.g400;
}

function pnlSign(val: number) {
  return val > 0 ? "+" : "";
}

/* ─── Summary Stats ─── */

function StatCard({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <View style={styles.statCard as ViewStyle}>
      <Text style={[styles.statValue as TextStyle, color ? { color } : undefined]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel as TextStyle} numberOfLines={1}>{label}</Text>
      {sub ? <Text style={styles.statSub as TextStyle} numberOfLines={1}>{sub}</Text> : null}
    </View>
  );
}

/* ─── Equity Curve ─── */

function EquityCurveCard({ data }: { data: EquityCurvePoint[] }) {
  const chartWidth = SCREEN_WIDTH - 32;
  const chartHeight = 160;

  const { points, zeroY, lastPnl } = useMemo(() => {
    if (data.length < 2) return { points: "", zeroY: chartHeight / 2, lastPnl: 0 };

    const pad = { top: 12, right: 8, bottom: 12, left: 8 };
    const values = data.map((d) => d.cumulative_pnl);
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const range = max - min || 1;

    const pts = data
      .map((d, i) => {
        const x = pad.left + (i / (data.length - 1)) * (chartWidth - pad.left - pad.right);
        const y = pad.top + (1 - (d.cumulative_pnl - min) / range) * (chartHeight - pad.top - pad.bottom);
        return `${x},${y}`;
      })
      .join(" ");

    const zy = pad.top + (1 - (0 - min) / range) * (chartHeight - pad.top - pad.bottom);
    const last = data[data.length - 1]?.cumulative_pnl ?? 0;

    return { points: pts, zeroY: zy, lastPnl: last };
  }, [data, chartWidth]);

  if (data.length < 2) {
    return (
      <View style={styles.card as ViewStyle}>
        <Text style={styles.cardTitle as TextStyle}>EQUITY CURVE</Text>
        <Text style={styles.emptyCardText as TextStyle}>
          Need at least 2 closed trading days
        </Text>
      </View>
    );
  }

  const curveColor = lastPnl >= 0 ? colors.green : colors.red;
  const last = data[data.length - 1];

  return (
    <View style={styles.card as ViewStyle}>
      <View style={styles.cardHeader as ViewStyle}>
        <Text style={styles.cardTitle as TextStyle}>EQUITY CURVE</Text>
        <Text style={[styles.cardHeaderValue as TextStyle, { color: pnlColor(lastPnl) }]}>
          {`${pnlSign(lastPnl)}${formatCurrency(lastPnl)}`}
        </Text>
      </View>
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={curveColor} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={curveColor} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        <Line x1={8} y1={zeroY} x2={chartWidth - 8} y2={zeroY} stroke={colors.g200} strokeWidth={1} strokeDasharray="4 4" />
        <Polygon points={`8,${zeroY} ${points} ${chartWidth - 8},${zeroY}`} fill="url(#eqGrad)" />
        <Polyline points={points} fill="none" stroke={curveColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

/* ─── Open Positions ─── */

function OpenPositionsCard({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return (
      <View style={styles.card as ViewStyle}>
        <Text style={styles.cardTitle as TextStyle}>OPEN POSITIONS</Text>
        <Text style={styles.emptyCardText as TextStyle}>No open positions</Text>
      </View>
    );
  }

  return (
    <View style={styles.card as ViewStyle}>
      <Text style={styles.cardTitle as TextStyle}>
        {`OPEN POSITIONS (${trades.length})`}
      </Text>
      {trades.map((t) => {
        const dirColor = t.direction === "long" ? colors.green : colors.red;
        const dirBg = t.direction === "long" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)";
        return (
          <View key={t.id} style={styles.positionRow as ViewStyle}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
              <Text style={styles.posPair as TextStyle}>{t.pair}</Text>
              <View style={[styles.dirBadge as ViewStyle, { backgroundColor: dirBg }]}>
                <Text style={[styles.dirText as TextStyle, { color: dirColor }]}>
                  {t.direction === "long" ? "BUY" : "SELL"}
                </Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.posPnl as TextStyle, { color: pnlColor(t.pnl ?? 0) }]}>
                {t.pnl != null ? `${pnlSign(t.pnl)}${formatCurrency(t.pnl)}` : "\u2014"}
              </Text>
              <Text style={styles.posDetail as TextStyle}>
                {`${t.entry_price} \u00B7 ${t.lot_size} lot`}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ─── Pair Performance ─── */

function PairPerformanceCard({ data }: { data: PairBreakdown[] }) {
  if (data.length === 0) {
    return (
      <View style={styles.card as ViewStyle}>
        <Text style={styles.cardTitle as TextStyle}>PAIR PERFORMANCE</Text>
        <Text style={styles.emptyCardText as TextStyle}>No closed trades yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.card as ViewStyle}>
      <Text style={styles.cardTitle as TextStyle}>PAIR PERFORMANCE</Text>
      {data.slice(0, 8).map((p) => (
        <View key={p.pair} style={styles.pairRow as ViewStyle}>
          <Text style={styles.pairName as TextStyle}>{p.pair}</Text>
          <View style={styles.pairBar as ViewStyle}>
            <View
              style={[
                styles.pairBarFill as ViewStyle,
                {
                  width: `${p.win_rate}%`,
                  backgroundColor: p.total_pnl >= 0 ? colors.lime : colors.red,
                } as ViewStyle,
              ]}
            />
          </View>
          <Text style={styles.pairWr as TextStyle}>{`${p.win_rate.toFixed(0)}%`}</Text>
          <Text style={[styles.pairPnl as TextStyle, { color: pnlColor(p.total_pnl) }]}>
            {`${pnlSign(p.total_pnl)}${formatCurrency(p.total_pnl)}`}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ─── Monthly Returns ─── */

function MonthlyReturnsCard({ data }: { data: MonthlyReturn[] }) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (data.length === 0) {
    return (
      <View style={styles.card as ViewStyle}>
        <Text style={styles.cardTitle as TextStyle}>MONTHLY RETURNS</Text>
        <Text style={styles.emptyCardText as TextStyle}>No monthly data yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.card as ViewStyle}>
      <Text style={styles.cardTitle as TextStyle}>MONTHLY RETURNS</Text>
      <View style={styles.monthGrid as ViewStyle}>
        {data.map((m) => {
          const monthIdx = parseInt(m.month.split("-")[1], 10) - 1;
          const year = m.month.split("-")[0];
          const bg =
            m.pnl > 0
              ? colors.lime25
              : m.pnl < 0
                ? colors.redBg
                : colors.g50;
          return (
            <View key={m.month} style={[styles.monthCell as ViewStyle, { backgroundColor: bg }]}>
              <Text style={styles.monthLabel as TextStyle}>
                {`${monthNames[monthIdx]} ${year}`}
              </Text>
              <Text style={[styles.monthPnl as TextStyle, { color: pnlColor(m.pnl) }]}>
                {`${pnlSign(m.pnl)}${formatCurrency(m.pnl)}`}
              </Text>
              <Text style={styles.monthMeta as TextStyle}>
                {`${m.trade_count}T \u00B7 ${m.win_rate.toFixed(0)}%`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ─── Quick Stats ─── */

function QuickStatsCard({ summary, stats }: { summary: PortfolioSummary; stats?: { avg_rr: number; best_trade: number; worst_trade: number; avg_win: number; avg_loss: number } }) {
  const rows = [
    { label: "Closed Trades", value: String(summary.closed_positions) },
    { label: "Avg R:R", value: (stats?.avg_rr ?? 0).toFixed(2) },
    { label: "Best Trade", value: formatCurrency(stats?.best_trade ?? 0), color: colors.green },
    { label: "Worst Trade", value: formatCurrency(stats?.worst_trade ?? 0), color: colors.red },
    { label: "Avg Win", value: formatCurrency(stats?.avg_win ?? 0), color: colors.green },
    { label: "Avg Loss", value: formatCurrency(stats?.avg_loss ?? 0), color: colors.red },
    { label: "Current DD", value: formatCurrency(summary.current_drawdown) },
    { label: "Worst Loss Streak", value: String(summary.longest_loss_streak) },
  ];

  return (
    <View style={styles.card as ViewStyle}>
      <Text style={styles.cardTitle as TextStyle}>QUICK STATS</Text>
      {rows.map((row) => (
        <View key={row.label} style={styles.quickRow as ViewStyle}>
          <Text style={styles.quickLabel as TextStyle}>{row.label}</Text>
          <Text style={[styles.quickValue as TextStyle, row.color ? { color: row.color } : undefined]}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ─── Main Screen ─── */

export default function PortfolioScreen() {
  const insets = useSafeAreaInsets();


  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary, isRefetching } = usePortfolioSummary(supabase);
  const { data: stats } = useTradeStats(supabase);
  const { data: equityCurve } = useEquityCurve(supabase);
  const { data: openPositions } = useOpenPositions(supabase);
  const { data: pairBreakdown } = usePairBreakdown(supabase);
  const { data: monthlyReturns } = useMonthlyReturns(supabase);

  const isEmpty = !summaryLoading && (summary?.open_positions ?? 0) === 0 && (summary?.closed_positions ?? 0) === 0;

  return (
    <View style={[styles.container as ViewStyle, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header as ViewStyle}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <IconSuitcase size={20} color={colors.lime} />
          <Text style={styles.title as TextStyle}>Portfolio</Text>
        </View>
        {summary && !isEmpty && summary.first_trade_date && (
          <Text style={styles.headerSub as TextStyle}>
            {`Since ${new Date(summary.first_trade_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
          </Text>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetchSummary()} />
        }
      >
        {summaryLoading ? (
          <View style={{ gap: 12, padding: 16 }}>
            <Skeleton width="100%" height={80} radius={12} />
            <Skeleton width="100%" height={180} radius={12} />
            <Skeleton width="100%" height={120} radius={12} />
          </View>
        ) : isEmpty ? (
          <EmptyState
            title="No trades yet"
            description="Log your first trade in the Journal to start tracking your portfolio."
          />
        ) : (
          <>
            {/* Summary Stats */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
              <StatCard
                label="TOTAL P&L"
                value={formatCurrency(summary?.total_pnl ?? 0)}
                color={pnlColor(summary?.total_pnl ?? 0)}
              />
              <StatCard
                label="OPEN P&L"
                value={formatCurrency(summary?.open_pnl ?? 0)}
                color={pnlColor(summary?.open_pnl ?? 0)}
                sub={`${summary?.open_positions ?? 0} pos`}
              />
              <StatCard
                label="WIN RATE"
                value={`${(stats?.win_rate ?? 0).toFixed(1)}%`}
                color={(stats?.win_rate ?? 0) >= 50 ? colors.green : colors.red}
              />
              <StatCard
                label="MAX DD"
                value={formatCurrency(summary?.max_drawdown ?? 0)}
                color={colors.red}
              />
              <StatCard
                label="STREAK"
                value={
                  (summary?.current_streak ?? 0) > 0
                    ? `${summary?.current_streak}W`
                    : (summary?.current_streak ?? 0) < 0
                      ? `${Math.abs(summary?.current_streak ?? 0)}L`
                      : "\u2014"
                }
                color={
                  (summary?.current_streak ?? 0) > 0
                    ? colors.green
                    : (summary?.current_streak ?? 0) < 0
                      ? colors.red
                      : colors.g400
                }
              />
            </ScrollView>

            {/* Cards */}
            <View style={styles.cardsContainer}>
              <EquityCurveCard data={equityCurve ?? []} />
              <OpenPositionsCard trades={openPositions ?? []} />
              <PairPerformanceCard data={pairBreakdown ?? []} />
              <MonthlyReturnsCard data={monthlyReturns ?? []} />
              {summary && <QuickStatsCard summary={summary} stats={stats} />}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* ─── Styles ─── */

const STAT_CARD_WIDTH = (SCREEN_WIDTH - 32 - 8 * 4) / 3.5;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: 20,
    fontFamily: fontFamily.sans.extrabold,
    color: colors.black,
    letterSpacing: -0.3,
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
    width: STAT_CARD_WIDTH,
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
  statSub: {
    fontSize: 9,
    fontFamily: fontFamily.sans.regular,
    color: colors.g400,
    marginTop: 1,
  },

  /* Cards */
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
  cardHeaderValue: {
    fontSize: 14,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "700",
  },
  emptyCardText: {
    fontSize: 13,
    fontFamily: fontFamily.sans.regular,
    color: colors.g400,
    textAlign: "center",
    paddingVertical: 8,
  },

  /* Open positions */
  positionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  posPair: {
    fontSize: 14,
    fontFamily: fontFamily.sans.bold,
    color: colors.black,
  },
  dirBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  dirText: {
    fontSize: 10,
    fontFamily: fontFamily.sans.bold,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  posPnl: {
    fontSize: 14,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "700",
  },
  posDetail: {
    fontSize: 11,
    fontFamily: fontFamily.mono.regular,
    color: colors.g400,
    marginTop: 2,
  },

  /* Pair performance */
  pairRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  pairName: {
    fontSize: 12,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "700",
    color: colors.black,
    minWidth: 70,
  },
  pairBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.g100,
    overflow: "hidden",
  },
  pairBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  pairWr: {
    fontSize: 11,
    fontFamily: fontFamily.sans.semibold,
    color: colors.g500,
    minWidth: 30,
    textAlign: "right",
  },
  pairPnl: {
    fontSize: 12,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "700",
    minWidth: 60,
    textAlign: "right",
  },

  /* Monthly returns */
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  monthCell: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.g100,
    minWidth: (SCREEN_WIDTH - 32 - 28 - 24) / 3,
    alignItems: "center",
  },
  monthLabel: {
    fontSize: 10,
    fontFamily: fontFamily.sans.semibold,
    color: colors.g400,
    marginBottom: 3,
  },
  monthPnl: {
    fontSize: 13,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "700",
  },
  monthMeta: {
    fontSize: 9,
    fontFamily: fontFamily.sans.regular,
    color: colors.g400,
    marginTop: 2,
  },

  /* Quick stats */
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  quickLabel: {
    fontSize: 13,
    fontFamily: fontFamily.sans.regular,
    color: colors.g500,
  },
  quickValue: {
    fontSize: 13,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "700",
    color: colors.black,
  },
});
