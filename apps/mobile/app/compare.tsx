import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  StyleSheet,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, radii, spacing, shadows } from "@/theme";
import { supabase } from "@/lib/supabase";
import { useFirms } from "@propian/shared/hooks";
import type { Firm } from "@propian/shared/types";
import { Input, Badge, RatingStars, Button, Skeleton, EmptyState } from "@/components/ui";
import { IconCompare } from "@/components/icons/IconCompare";
import { IconCheck } from "@/components/icons/IconCheck";
import { IconStar } from "@/components/icons/IconStar";
import { IconArrow } from "@/components/icons/IconArrow";
import { IconAward } from "@/components/icons/IconAward";

/* ================================================================== */
/*  Types & config                                                     */
/* ================================================================== */

type CompareDirection = "higher" | "lower" | "none";

interface CompareRow {
  key: string;
  label: string;
  getValue: (f: Firm) => string;
  getNumeric?: (f: Firm) => number | null;
  direction: CompareDirection;
}

interface CompareGroup {
  title: string;
  rows: CompareRow[];
}

function parseNum(str: string | null | undefined): number | null {
  if (!str || str === "\u2014" || str === "N/A") return null;
  const match = str.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

function parseMoney(str: string | null | undefined): number | null {
  if (!str) return null;
  const match = str.match(/([\d.]+)\s*(M|K)?/i);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const mult =
    match[2]?.toUpperCase() === "M" ? 1_000_000 : match[2]?.toUpperCase() === "K" ? 1_000 : 1;
  return num * mult;
}

const COMPARE_GROUPS: CompareGroup[] = [
  {
    title: "Costs",
    rows: [
      {
        key: "challenge_fee_min",
        label: "Challenge Fee",
        getValue: (f) => (f.challenge_fee_min != null ? `$${f.challenge_fee_min}` : "N/A"),
        getNumeric: (f) => f.challenge_fee_min,
        direction: "lower",
      },
      {
        key: "profit_split",
        label: "Profit Split",
        getValue: (f) => f.profit_split ?? "N/A",
        getNumeric: (f) => parseNum(f.profit_split),
        direction: "higher",
      },
    ],
  },
  {
    title: "Risk Management",
    rows: [
      {
        key: "max_drawdown",
        label: "Max Drawdown",
        getValue: (f) => f.max_drawdown ?? "N/A",
        getNumeric: (f) => parseNum(f.max_drawdown),
        direction: "higher",
      },
      {
        key: "daily_drawdown",
        label: "Daily Drawdown",
        getValue: (f) => f.daily_drawdown ?? "N/A",
        getNumeric: (f) => parseNum(f.daily_drawdown),
        direction: "higher",
      },
    ],
  },
  {
    title: "Performance",
    rows: [
      {
        key: "rating_avg",
        label: "Rating",
        getValue: (f) => f.rating_avg.toFixed(1),
        getNumeric: (f) => f.rating_avg,
        direction: "higher",
      },
      {
        key: "review_count",
        label: "Reviews",
        getValue: (f) => f.review_count.toLocaleString(),
        getNumeric: (f) => f.review_count,
        direction: "higher",
      },
      {
        key: "pass_rate",
        label: "Pass Rate",
        getValue: (f) => f.pass_rate ?? "N/A",
        getNumeric: (f) => parseNum(f.pass_rate),
        direction: "higher",
      },
      {
        key: "total_payouts",
        label: "Total Payouts",
        getValue: (f) => f.total_payouts ?? "N/A",
        getNumeric: (f) => parseMoney(f.total_payouts),
        direction: "higher",
      },
    ],
  },
  {
    title: "Features",
    rows: [
      {
        key: "payout_cycle",
        label: "Payout Cycle",
        getValue: (f) => f.payout_cycle ?? "N/A",
        direction: "none",
      },
      {
        key: "scaling_plan",
        label: "Scaling Plan",
        getValue: (f) => (f.scaling_plan ? "Yes" : "No"),
        getNumeric: (f) => (f.scaling_plan ? 1 : 0),
        direction: "higher",
      },
      {
        key: "platforms",
        label: "Platforms",
        getValue: (f) => (f.platforms.length > 0 ? f.platforms.join(", ") : "N/A"),
        direction: "none",
      },
    ],
  },
  {
    title: "General",
    rows: [
      {
        key: "founded",
        label: "Founded",
        getValue: (f) => f.founded?.toString() ?? "N/A",
        getNumeric: (f) => f.founded,
        direction: "lower",
      },
    ],
  },
];

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function getBestWorst(
  firms: Firm[],
  getNumeric: ((f: Firm) => number | null) | undefined,
  direction: CompareDirection,
): { bestIndex: number | null; worstIndex: number | null } {
  if (!getNumeric || direction === "none" || firms.length < 2) {
    return { bestIndex: null, worstIndex: null };
  }
  const values = firms.map((f) => getNumeric(f));
  const validIndices = values.map((v, i) => (v !== null ? i : -1)).filter((i) => i !== -1);
  if (validIndices.length < 2) return { bestIndex: null, worstIndex: null };

  let bestIdx = validIndices[0];
  let worstIdx = validIndices[0];
  for (const idx of validIndices) {
    const val = values[idx]!;
    if (direction === "higher") {
      if (val > values[bestIdx]!) bestIdx = idx;
      if (val < values[worstIdx]!) worstIdx = idx;
    } else {
      if (val < values[bestIdx]!) bestIdx = idx;
      if (val > values[worstIdx]!) worstIdx = idx;
    }
  }
  if (values[bestIdx] === values[worstIdx]) return { bestIndex: null, worstIndex: null };
  return { bestIndex: bestIdx, worstIndex: worstIdx };
}

interface VerdictItem {
  firm: Firm;
  strengths: string[];
  score: number;
}

function computeVerdicts(firms: Firm[]): { verdicts: VerdictItem[]; totalMetrics: number } {
  const scores = firms.map(() => ({ strengths: [] as string[], score: 0 }));
  let totalMetrics = 0;
  for (const group of COMPARE_GROUPS) {
    for (const row of group.rows) {
      if (!row.getNumeric || row.direction === "none") continue;
      totalMetrics++;
      const { bestIndex } = getBestWorst(firms, row.getNumeric, row.direction);
      if (bestIndex !== null) {
        scores[bestIndex].strengths.push(row.label);
        scores[bestIndex].score++;
      }
    }
  }
  return {
    verdicts: firms.map((firm, i) => ({ firm, strengths: scores[i].strengths, score: scores[i].score })),
    totalMetrics,
  };
}

/* ================================================================== */
/*  Firm Pick Card                                                     */
/* ================================================================== */

function FirmPickCard({
  firm,
  selected,
  onToggle,
}: {
  firm: Firm;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.pickCard, selected && styles.pickCardSelected]}
    >
      {selected && (
        <View style={styles.pickCheck}>
          <IconCheck size={10} color={colors.black} />
        </View>
      )}
      <View style={[styles.pickLogo, { backgroundColor: firm.logo_color ?? colors.g600 }]}>
        <Text style={styles.pickLogoText}>{firm.logo_text ?? firm.name.charAt(0)}</Text>
      </View>
      <Text style={styles.pickName} numberOfLines={1}>{firm.name}</Text>
      <View style={styles.pickRatingRow}>
        <IconStar size={10} color={colors.lime} />
        <Text style={styles.pickRatingText}>{firm.rating_avg.toFixed(1)}</Text>
      </View>
    </Pressable>
  );
}

/* ================================================================== */
/*  Main Screen                                                        */
/* ================================================================== */

export default function CompareScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: allFirms, isLoading } = useFirms(supabase);

  const [view, setView] = useState<"select" | "compare">("select");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFirms = useMemo(() => {
    if (!allFirms) return [];
    if (!searchQuery.trim()) return allFirms;
    const q = searchQuery.toLowerCase();
    return allFirms.filter((f) => f.name.toLowerCase().includes(q));
  }, [allFirms, searchQuery]);

  const comparedFirms = useMemo(() => {
    if (!allFirms) return [];
    return selectedSlugs
      .map((slug) => allFirms.find((f) => f.slug === slug))
      .filter((f): f is Firm => f !== undefined);
  }, [allFirms, selectedSlugs]);

  const toggleFirm = useCallback((slug: string) => {
    setSelectedSlugs((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= 4) return prev;
      return [...prev, slug];
    });
  }, []);

  const handleCompare = useCallback(() => setView("compare"), []);
  const handleBack = useCallback(() => setView("select"), []);

  const handleShare = useCallback(() => {
    const slugs = selectedSlugs.join(",");
    Share.share({
      message: `Compare prop firms on Propian: https://propian.com/compare?firms=${slugs}`,
    });
  }, [selectedSlugs]);

  const { verdicts, totalMetrics } = useMemo(
    () => computeVerdicts(comparedFirms),
    [comparedFirms],
  );
  const winner = verdicts.length > 0
    ? verdicts.reduce((a, b) => (b.score > a.score ? b : a), verdicts[0])
    : null;

  const renderPickItem = useCallback(
    ({ item, index }: { item: Firm; index: number }) => (
      <View style={[styles.pickGridItem, index % 2 === 0 ? styles.pickGridLeft : styles.pickGridRight]}>
        <FirmPickCard
          firm={item}
          selected={selectedSlugs.includes(item.slug)}
          onToggle={() => toggleFirm(item.slug)}
        />
      </View>
    ),
    [selectedSlugs, toggleFirm],
  );

  /* ── Render ── */
  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <IconArrow size={18} color={colors.black} />
          </View>
        </Pressable>
        <Text style={styles.headerTitle}>Compare Firms</Text>
        <Badge variant="lime">{`${selectedSlugs.length} selected`}</Badge>
      </View>

      {/* ═══════════ SELECTION VIEW ═══════════ */}
      {view === "select" && (
        <View style={styles.flex1}>
          {/* Search */}
          <View style={styles.searchContainer}>
            <Input
              placeholder="Search firms..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Hint */}
          <Text style={styles.hint}>
            {selectedSlugs.length === 0
              ? "Select 2\u20134 firms to compare side by side"
              : selectedSlugs.length === 1
                ? "Select at least one more firm"
                : `${selectedSlugs.length} firms selected (max 4)`}
          </Text>

          {/* Picker Grid */}
          {isLoading ? (
            <View style={styles.loadingGrid}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View key={i} style={styles.pickGridItem}>
                  <Skeleton height={110} radius={radii.md} />
                </View>
              ))}
            </View>
          ) : filteredFirms.length === 0 ? (
            <EmptyState
              icon={<IconCompare size={36} color={colors.g300} />}
              title="No firms found"
              description={searchQuery ? `No results for "${searchQuery}"` : "No firms available"}
            />
          ) : (
            <FlatList
              data={filteredFirms}
              keyExtractor={(item) => item.id}
              renderItem={renderPickItem}
              numColumns={2}
              contentContainerStyle={styles.pickList}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Compare Button — fixed bottom */}
          {selectedSlugs.length >= 2 && (
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <Button variant="lime" onPress={handleCompare}>
                Compare {selectedSlugs.length} Firms
              </Button>
            </View>
          )}
        </View>
      )}

      {/* ═══════════ COMPARISON VIEW ═══════════ */}
      {view === "compare" && (
        <ScrollView contentContainerStyle={styles.compareScroll} showsVerticalScrollIndicator={false}>
          {/* Change Selection */}
          <Pressable onPress={handleBack} style={styles.changeBtn}>
            <View style={{ transform: [{ rotate: "180deg" }] }}>
              <IconArrow size={14} color={colors.black} />
            </View>
            <Text style={styles.changeBtnText}>Change Selection</Text>
          </Pressable>

          {comparedFirms.length < 2 ? (
            <Skeleton height={300} radius={radii.lg} />
          ) : (
            <>
              {/* Firm Header Strip */}
              <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                  <View style={styles.labelCell} />
                  {comparedFirms.map((firm) => (
                    <View key={firm.id} style={styles.firmHeaderCell}>
                      <View style={[styles.firmHeaderLogo, { backgroundColor: firm.logo_color ?? colors.g600 }]}>
                        <Text style={styles.firmHeaderLogoText}>
                          {firm.logo_text ?? firm.name.charAt(0)}
                        </Text>
                      </View>
                      <Text style={styles.firmHeaderName} numberOfLines={1}>{firm.name}</Text>
                      <Text style={styles.firmHeaderRating}>{firm.rating_avg.toFixed(1)}</Text>
                    </View>
                  ))}
                </View>

                {/* Groups & Rows */}
                {COMPARE_GROUPS.map((group) => (
                  <View key={group.title}>
                    <View style={styles.groupTitle}>
                      <Text style={styles.groupTitleText}>{group.title}</Text>
                    </View>
                    {group.rows.map((row) => {
                      const { bestIndex, worstIndex } = getBestWorst(
                        comparedFirms,
                        row.getNumeric,
                        row.direction,
                      );
                      return (
                        <View key={row.key} style={styles.compareRow}>
                          <View style={styles.labelCell}>
                            <Text style={styles.rowLabel}>{row.label}</Text>
                          </View>
                          {comparedFirms.map((firm, i) => (
                            <View key={firm.id} style={styles.valueCell}>
                              <Text
                                style={[
                                  styles.rowValue,
                                  bestIndex === i && styles.rowValueBest,
                                  worstIndex === i && styles.rowValueWorst,
                                ]}
                              >
                                {row.getValue(firm)}
                              </Text>
                              {bestIndex === i && <Text style={styles.crownEmoji}>{"👑"}</Text>}
                            </View>
                          ))}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* Verdict Section */}
              <View style={styles.verdict}>
                <View style={styles.verdictHeader}>
                  <IconAward size={20} color={colors.lime} />
                  <Text style={styles.verdictTitle}>Verdict</Text>
                </View>
                <View style={styles.verdictBody}>
                  <Text style={styles.verdictSubtitle}>
                    Based on {totalMetrics} comparable metrics:
                  </Text>
                  {winner && (
                    <Text style={styles.verdictWinner}>
                      {winner.firm.name} leads in {winner.score} of {totalMetrics} categories
                    </Text>
                  )}

                  {verdicts.map((v) => (
                    <View key={v.firm.id} style={styles.verdictCard}>
                      <View
                        style={[styles.verdictCardIcon, { backgroundColor: v.firm.logo_color ?? colors.g600 }]}
                      >
                        <Text style={styles.verdictCardIconText}>
                          {v.firm.logo_text ?? v.firm.name.charAt(0)}
                        </Text>
                      </View>
                      <View style={styles.verdictCardContent}>
                        <Text style={styles.verdictCardName}>{v.firm.name}</Text>
                        <Text style={styles.verdictCardScore}>
                          Best in {v.score} metric{v.score !== 1 ? "s" : ""}
                        </Text>
                        {v.strengths.length > 0 ? (
                          v.strengths.map((s) => (
                            <Text key={s} style={styles.verdictStrength}>+ {s}</Text>
                          ))
                        ) : (
                          <Text style={styles.verdictNoStrength}>No leading metrics</Text>
                        )}
                        {/* Rating bar */}
                        <View style={styles.ratingBar}>
                          {Array.from({ length: 10 }, (_, i) => (
                            <View
                              key={i}
                              style={[
                                styles.ratingSeg,
                                {
                                  backgroundColor:
                                    i < Math.round((v.score / Math.max(totalMetrics, 1)) * 10)
                                      ? (v.firm.logo_color ?? colors.lime)
                                      : colors.g200,
                                },
                              ]}
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* Share */}
                  <View style={styles.shareRow}>
                    <Button variant="ghost" onPress={handleShare}>
                      Share Comparison
                    </Button>
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.g50,
  },
  flex1: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 22,
    color: colors.black,
    letterSpacing: -0.5,
  },
  searchContainer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  hint: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g400,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },

  /* ── Picker Grid ── */
  pickList: {
    paddingHorizontal: spacing.base,
    paddingBottom: 100,
  },
  pickGridItem: {
    flex: 1,
    marginBottom: spacing.md,
  },
  pickGridLeft: {
    marginRight: 6,
  },
  pickGridRight: {
    marginLeft: 6,
  },
  pickCard: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.md,
    padding: 14,
    alignItems: "center",
    position: "relative",
    ...shadows.sm,
  },
  pickCardSelected: {
    borderColor: colors.lime,
    backgroundColor: colors.lime10,
  },
  pickCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  pickLogo: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  pickLogoText: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 15,
    color: colors.white,
  },
  pickName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: colors.black,
    textAlign: "center",
  },
  pickRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
  },
  pickRatingText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: colors.g400,
  },
  loadingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.base,
    gap: 12,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 2,
    borderTopColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
  },

  /* ── Comparison View ── */
  compareScroll: {
    padding: spacing.base,
    paddingBottom: 100,
  },
  changeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.base,
  },
  changeBtnText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: colors.black,
  },

  /* ── Table ── */
  tableContainer: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.lg,
    overflow: "hidden",
    ...shadows.sm,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.g900,
  },
  firmHeaderCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderLeftWidth: 1,
    borderLeftColor: colors.g800,
  },
  firmHeaderLogo: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  firmHeaderLogoText: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 13,
    color: colors.white,
  },
  firmHeaderName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 12,
    color: colors.white,
    textAlign: "center",
  },
  firmHeaderRating: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
    color: colors.lime,
    marginTop: 2,
  },
  labelCell: {
    width: 110,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: colors.g200,
  },
  groupTitle: {
    backgroundColor: colors.g50,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.g200,
  },
  groupTitleText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 10,
    color: colors.g400,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  compareRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  rowLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: colors.g600,
  },
  valueCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderLeftWidth: 1,
    borderLeftColor: colors.g100,
    position: "relative",
  },
  rowValue: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 12,
    color: colors.black,
    textAlign: "center",
  },
  rowValueBest: {
    color: colors.green,
  },
  rowValueWorst: {
    color: colors.red,
  },
  crownEmoji: {
    position: "absolute",
    top: 2,
    right: 4,
    fontSize: 8,
  },

  /* ── Verdict ── */
  verdict: {
    marginTop: spacing.lg,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.lg,
    overflow: "hidden",
    ...shadows.sm,
  },
  verdictHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
  },
  verdictTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: colors.white,
  },
  verdictBody: {
    backgroundColor: colors.white,
    padding: spacing.lg,
  },
  verdictSubtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g500,
    marginBottom: 4,
  },
  verdictWinner: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
    color: colors.black,
    marginBottom: 16,
  },
  verdictCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  verdictCardIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  verdictCardIconText: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 13,
    color: colors.white,
  },
  verdictCardContent: {
    flex: 1,
  },
  verdictCardName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: colors.black,
    marginBottom: 2,
  },
  verdictCardScore: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: colors.g400,
    marginBottom: 6,
  },
  verdictStrength: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: colors.green,
    marginBottom: 2,
  },
  verdictNoStrength: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: colors.g300,
    fontStyle: "italic",
  },
  ratingBar: {
    flexDirection: "row",
    gap: 2,
    marginTop: 8,
  },
  ratingSeg: {
    flex: 1,
    height: 6,
    borderRadius: 2,
  },
  shareRow: {
    alignItems: "center",
    marginTop: spacing.base,
  },
});
