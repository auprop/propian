import { useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { triggerHaptic, triggerSelection } from "@/hooks/useHaptics";
import { useTrades, useTradeStats, useDeleteTrade } from "@propian/shared/hooks";
import type { Trade, TradeFilter } from "@propian/shared/types";
import { formatCurrency } from "@propian/shared/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { IconChevLeft } from "@/components/icons/IconChevLeft";
import { IconPlus } from "@/components/icons/IconPlus";
import { IconChevDown } from "@/components/icons/IconChevDown";
import { colors, fontFamily, radii, spacing } from "@/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;

const EMOTIONS: Record<string, string> = {
  confident: "\u{1F60E}",
  neutral: "\u{1F610}",
  fearful: "\u{1F628}",
  greedy: "\u{1F911}",
  revenge: "\u{1F624}",
};

/* ─── Stat Card ─── */

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statCard as ViewStyle}>
      <Text
        style={[styles.statValue as TextStyle, color ? { color } : undefined]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={styles.statLabel as TextStyle} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* ─── Filter Chip ─── */

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => {
        triggerSelection();
        onPress();
      }}
      activeOpacity={0.7}
      style={[
        styles.chip as ViewStyle,
        active && (styles.chipActive as ViewStyle),
      ]}
    >
      <Text
        style={[
          styles.chipText as TextStyle,
          active && (styles.chipTextActive as TextStyle),
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ─── Detail Grid Item ─── */

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem as ViewStyle}>
      <Text style={styles.detailItemLabel as TextStyle}>{label}</Text>
      <Text style={styles.detailItemValue as TextStyle}>{value}</Text>
    </View>
  );
}

/* ─── Trade Item (expandable) ─── */

function TradeItem({
  trade,
  isExpanded,
  onToggle,
  onDelete,
}: {
  trade: Trade;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
}) {
  const pnlColor =
    (trade.pnl ?? 0) > 0
      ? colors.green
      : (trade.pnl ?? 0) < 0
        ? colors.red
        : colors.g400;
  const dirColor = trade.direction === "long" ? colors.green : colors.red;
  const dirBg =
    trade.direction === "long"
      ? "rgba(34,197,94,0.12)"
      : "rgba(239,68,68,0.12)";

  const dateStr = new Date(trade.trade_date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const emotionEmoji = trade.emotion ? EMOTIONS[trade.emotion] ?? "" : "";

  return (
    <View style={styles.tradeRow as ViewStyle}>
      {/* Tappable summary */}
      <TouchableOpacity
        onPress={() => {
          triggerHaptic("light");
          onToggle();
        }}
        activeOpacity={0.7}
        style={styles.tradeSummary as ViewStyle}
      >
        {/* Row 1: Pair + Direction badge + spacer + P&L + chevron */}
        <View style={styles.row1 as ViewStyle}>
          <Text style={styles.tradePair as TextStyle}>{trade.pair}</Text>
          <View style={[styles.dirBadge as ViewStyle, { backgroundColor: dirBg }]}>
            <Text style={[styles.dirText as TextStyle, { color: dirColor }]}>
              {trade.direction === "long" ? "BUY" : "SELL"}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={[styles.tradePnl as TextStyle, { color: pnlColor }]}>
            {trade.pnl != null ? formatCurrency(trade.pnl) : "\u2014"}
          </Text>
          <View
            style={{
              transform: [{ rotate: isExpanded ? "180deg" : "0deg" }],
              marginLeft: 4,
            }}
          >
            <IconChevDown size={16} color={colors.g400} />
          </View>
        </View>

        {/* Row 2: Entry → Exit · R:R · Date · Emotion */}
        <View style={styles.row2 as ViewStyle}>
          <Text style={styles.priceText as TextStyle}>
            {`${trade.entry_price} \u2192 ${trade.exit_price ?? "\u2014"}`}
          </Text>
          {trade.rr_ratio != null && (
            <Text style={styles.rrText as TextStyle}>
              {trade.rr_ratio.toFixed(2)}R
            </Text>
          )}
          <Text style={styles.dateText as TextStyle}>{dateStr}</Text>
          {emotionEmoji ? <Text style={{ fontSize: 14 }}>{emotionEmoji}</Text> : null}
        </View>
      </TouchableOpacity>

      {/* Expanded detail */}
      {isExpanded && (
        <View style={styles.expandedDetail as ViewStyle}>
          <View style={styles.detailDivider as ViewStyle} />

          {/* Trade Details grid */}
          <Text style={styles.detailSectionTitle as TextStyle}>TRADE DETAILS</Text>
          <View style={styles.detailGrid as ViewStyle}>
            <DetailItem label="Entry" value={String(trade.entry_price)} />
            <DetailItem label="Exit" value={trade.exit_price != null ? String(trade.exit_price) : "\u2014"} />
            <DetailItem label="Lot Size" value={String(trade.lot_size)} />
            <DetailItem label="Stop Loss" value={trade.stop_loss != null ? String(trade.stop_loss) : "\u2014"} />
            <DetailItem label="Take Profit" value={trade.take_profit != null ? String(trade.take_profit) : "\u2014"} />
            <DetailItem label="Commission" value={formatCurrency(trade.commission)} />
          </View>

          {/* Confidence */}
          {trade.confidence != null && (
            <>
              <Text style={styles.detailSectionTitle as TextStyle}>CONFIDENCE</Text>
              <View style={styles.confidenceBar as ViewStyle}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.confidenceSeg as ViewStyle,
                      i <= (trade.confidence ?? 0) && (styles.confidenceSegFilled as ViewStyle),
                    ]}
                  />
                ))}
              </View>
            </>
          )}

          {/* Emotion */}
          {trade.emotion && (
            <>
              <Text style={styles.detailSectionTitle as TextStyle}>EMOTION</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 22 }}>{emotionEmoji}</Text>
                <Text style={styles.emotionLabel as TextStyle}>
                  {trade.emotion.charAt(0).toUpperCase() + trade.emotion.slice(1)}
                </Text>
              </View>
            </>
          )}

          {/* Notes */}
          {trade.notes ? (
            <>
              <Text style={styles.detailSectionTitle as TextStyle}>NOTES</Text>
              <Text style={styles.notesText as TextStyle}>{trade.notes}</Text>
            </>
          ) : null}

          {/* Tags */}
          {trade.tags.length > 0 && (
            <>
              <Text style={styles.detailSectionTitle as TextStyle}>TAGS</Text>
              <View style={styles.tagRow as ViewStyle}>
                {trade.tags.map((tag) => (
                  <View key={tag} style={styles.tagBadge as ViewStyle}>
                    <Text style={styles.tagBadgeText as TextStyle}>{tag}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Mistakes */}
          {trade.mistakes.length > 0 && (
            <>
              <Text style={styles.detailSectionTitle as TextStyle}>MISTAKES</Text>
              <View style={styles.tagRow as ViewStyle}>
                {trade.mistakes.map((m) => (
                  <View key={m} style={styles.mistakeBadge as ViewStyle}>
                    <Text style={styles.mistakeBadgeText as TextStyle}>{m}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Delete button */}
          <TouchableOpacity
            style={styles.deleteBtn as ViewStyle}
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic("warning");
              Alert.alert("Delete Trade", "Are you sure you want to delete this trade?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => {
                  triggerHaptic("error");
                  onDelete(trade.id);
                }},
              ]);
            }}
          >
            <Text style={styles.deleteBtnText as TextStyle}>Delete Trade</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* ─── Main Screen ─── */

export default function JournalScreen() {
  const insets = useSafeAreaInsets();


  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filters: TradeFilter | undefined = useMemo(() => {
    if (statusFilter === "all") return undefined;
    return { status: statusFilter as TradeFilter["status"] };
  }, [statusFilter]);

  const {
    data: tradesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useTrades(supabase, filters);

  const { data: stats } = useTradeStats(supabase);
  const deleteTrade = useDeleteTrade(supabase);

  const trades: Trade[] =
    tradesData?.pages.flatMap((page) => page.data ?? []) ?? [];

  const handleDelete = useCallback(
    (id: string) => {
      deleteTrade.mutate(id);
      setExpandedId(null);
    },
    [deleteTrade],
  );

  const renderItem = useCallback(
    ({ item }: { item: Trade }) => (
      <TradeItem
        trade={item}
        isExpanded={expandedId === item.id}
        onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
        onDelete={handleDelete}
      />
    ),
    [expandedId, handleDelete],
  );

  /* ─── Stats + Filters (ListHeader) ─── */

  const ListHeader = (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsRow}
        style={{ marginBottom: 12 }}
      >
        <StatCard label="TOTAL" value={String(stats?.total_trades ?? 0)} />
        <StatCard
          label="WIN RATE"
          value={`${(stats?.win_rate ?? 0).toFixed(1)}%`}
          color={(stats?.win_rate ?? 0) >= 50 ? colors.green : colors.red}
        />
        <StatCard label="AVG R:R" value={(stats?.avg_rr ?? 0).toFixed(2)} />
        <StatCard
          label="NET P&L"
          value={formatCurrency(stats?.total_pnl ?? 0)}
          color={(stats?.total_pnl ?? 0) >= 0 ? colors.green : colors.red}
        />
        <StatCard
          label="PF"
          value={
            stats?.profit_factor === Infinity
              ? "\u221E"
              : (stats?.profit_factor ?? 0).toFixed(2)
          }
        />
      </ScrollView>

      <View style={styles.filtersRow as ViewStyle}>
        {(["all", "open", "closed", "breakeven"] as const).map((s) => (
          <Chip
            key={s}
            label={s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            active={statusFilter === s}
            onPress={() => setStatusFilter(s)}
          />
        ))}
      </View>
    </>
  );

  return (
    <View style={[styles.container as ViewStyle, { paddingTop: insets.top }]}>
      <View style={styles.header as ViewStyle}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn as ViewStyle}>
          <IconChevLeft size={20} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle as TextStyle}>Journal</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={trades}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        extraData={expandedId}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: 8 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} width="100%" height={72} radius={12} />
              ))}
            </View>
          ) : isError ? (
            <EmptyState
              title="Failed to load"
              description="Something went wrong."
            />
          ) : (
            <EmptyState
              title="No trades yet"
              description="Log your first trade to start tracking."
            />
          )
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab as ViewStyle, { bottom: insets.bottom + 20 }]}
        activeOpacity={0.8}
        onPress={() => {
          triggerHaptic("medium");
          router.push("/journal/log");
        }}
      >
        <IconPlus size={22} color={colors.black} />
      </TouchableOpacity>
    </View>
  );
}

/* ─── Styles ─── */

const STAT_CARD_WIDTH = (SCREEN_WIDTH - 32 - 8 * 4) / 3.5;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },

  /* Stats */
  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 2,
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

  /* Filter chips */
  filtersRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.black,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.black,
  },
  chipText: {
    fontSize: 12,
    fontFamily: fontFamily.sans.semibold,
    color: colors.black,
  },
  chipTextActive: {
    color: colors.lime,
  },

  /* Trade row */
  tradeRow: {
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    marginBottom: 8,
    overflow: "hidden",
  },
  tradeSummary: {
    padding: 12,
  },
  row1: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  row2: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  tradePair: {
    fontSize: 15,
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
  tradePnl: {
    fontSize: 15,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "700",
  },
  priceText: {
    fontSize: 12,
    fontFamily: fontFamily.mono.regular,
    color: colors.g500,
  },
  rrText: {
    fontSize: 12,
    fontFamily: fontFamily.mono.regular,
    color: colors.g500,
  },
  dateText: {
    fontSize: 11,
    fontFamily: fontFamily.sans.medium,
    color: colors.g400,
  },

  /* Expanded detail */
  expandedDetail: {
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  detailDivider: {
    height: 1,
    backgroundColor: colors.g200,
    marginBottom: 12,
  },
  detailSectionTitle: {
    fontSize: 10,
    fontFamily: fontFamily.sans.bold,
    color: colors.g400,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  detailItem: {
    width: (SCREEN_WIDTH - 32 - 24 - 16) / 3,
    backgroundColor: colors.g50,
    borderRadius: radii.sm,
    padding: 10,
  },
  detailItemLabel: {
    fontSize: 9,
    fontFamily: fontFamily.sans.medium,
    color: colors.g400,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  detailItemValue: {
    fontSize: 14,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "700",
    color: colors.black,
  },

  /* Confidence bar */
  confidenceBar: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 12,
    maxWidth: 200,
  },
  confidenceSeg: {
    flex: 1,
    height: 10,
    borderRadius: 3,
    backgroundColor: colors.g200,
  },
  confidenceSegFilled: {
    backgroundColor: colors.lime,
  },

  /* Emotion */
  emotionLabel: {
    fontSize: 14,
    fontFamily: fontFamily.sans.semibold,
    color: colors.black,
  },

  /* Notes */
  notesText: {
    fontSize: 13,
    fontFamily: fontFamily.sans.regular,
    color: colors.g600,
    lineHeight: 20,
    marginBottom: 12,
  },

  /* Tags & Mistakes */
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.lime25,
  },
  tagBadgeText: {
    fontSize: 11,
    fontFamily: fontFamily.sans.semibold,
    color: colors.black,
  },
  mistakeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.red,
    backgroundColor: colors.redBg,
  },
  mistakeBadgeText: {
    fontSize: 11,
    fontFamily: fontFamily.sans.semibold,
    color: colors.red,
  },

  /* Delete */
  deleteBtn: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: radii.sm,
    alignSelf: "flex-start",
  },
  deleteBtnText: {
    fontSize: 13,
    fontFamily: fontFamily.sans.semibold,
    color: colors.red,
  },

  /* FAB */
  fab: {
    position: "absolute",
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.lime,
    borderWidth: 2,
    borderColor: colors.black,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
});
