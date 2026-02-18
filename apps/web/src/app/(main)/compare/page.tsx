"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFirms } from "@propian/shared/hooks";
import type { Firm } from "@propian/shared/types";
import {
  IconCompare,
  IconCheck,
  IconSearch,
  IconStar,
  IconShare,
  IconTrendUp,
  IconTrendDown,
  IconDollar,
  IconShield,
  IconChart,
  IconGlobe,
  IconClock,
  IconAward,
  IconArrow,
} from "@propian/shared/icons";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RatingStars } from "@/components/ui/RatingStars";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

/* ================================================================== */
/*  Types & config                                                     */
/* ================================================================== */

type CompareDirection = "higher" | "lower" | "none";

interface CompareRow {
  key: string;
  label: string;
  icon: React.ReactNode;
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
        icon: <IconDollar size={14} />,
        getValue: (f) => (f.challenge_fee_min != null ? `$${f.challenge_fee_min}` : "N/A"),
        getNumeric: (f) => f.challenge_fee_min,
        direction: "lower",
      },
      {
        key: "profit_split",
        label: "Profit Split",
        icon: <IconChart size={14} />,
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
        icon: <IconShield size={14} />,
        getValue: (f) => f.max_drawdown ?? "N/A",
        getNumeric: (f) => parseNum(f.max_drawdown),
        direction: "higher",
      },
      {
        key: "daily_drawdown",
        label: "Daily Drawdown",
        icon: <IconTrendDown size={14} />,
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
        icon: <IconStar size={14} />,
        getValue: (f) => f.rating_avg.toFixed(1),
        getNumeric: (f) => f.rating_avg,
        direction: "higher",
      },
      {
        key: "review_count",
        label: "Reviews",
        icon: <IconCompare size={14} />,
        getValue: (f) => f.review_count.toLocaleString(),
        getNumeric: (f) => f.review_count,
        direction: "higher",
      },
      {
        key: "pass_rate",
        label: "Pass Rate",
        icon: <IconTrendUp size={14} />,
        getValue: (f) => f.pass_rate ?? "N/A",
        getNumeric: (f) => parseNum(f.pass_rate),
        direction: "higher",
      },
      {
        key: "total_payouts",
        label: "Total Payouts",
        icon: <IconDollar size={14} />,
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
        icon: <IconClock size={14} />,
        getValue: (f) => f.payout_cycle ?? "N/A",
        direction: "none",
      },
      {
        key: "scaling_plan",
        label: "Scaling Plan",
        icon: <IconTrendUp size={14} />,
        getValue: (f) => (f.scaling_plan ? "Yes" : "No"),
        getNumeric: (f) => (f.scaling_plan ? 1 : 0),
        direction: "higher",
      },
      {
        key: "platforms",
        label: "Platforms",
        icon: <IconGlobe size={14} />,
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
        icon: <IconClock size={14} />,
        getValue: (f) => f.founded?.toString() ?? "N/A",
        getNumeric: (f) => f.founded,
        direction: "lower",
      },
      {
        key: "website",
        label: "Website",
        icon: <IconGlobe size={14} />,
        getValue: (f) => {
          if (!f.website) return "N/A";
          try {
            return new URL(f.website).hostname.replace("www.", "");
          } catch {
            return f.website;
          }
        },
        direction: "none",
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

  if (values[bestIdx] === values[worstIdx]) {
    return { bestIndex: null, worstIndex: null };
  }

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
    verdicts: firms.map((firm, i) => ({
      firm,
      strengths: scores[i].strengths,
      score: scores[i].score,
    })),
    totalMetrics,
  };
}

/* ================================================================== */
/*  Firm Picker Card                                                   */
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
    <div
      className={`pt-compare-firm-pick ${selected ? "selected" : ""}`}
      onClick={onToggle}
    >
      <div className="pick-check">
        <IconCheck size={12} />
      </div>
      <div
        className="pt-compare-firm-pick-logo"
        style={{ background: firm.logo_color ?? "var(--g600)" }}
      >
        {firm.logo_text ?? firm.name.charAt(0)}
      </div>
      <div className="pt-compare-firm-pick-name">{firm.name}</div>
      <div className="pt-compare-firm-pick-rating">
        <IconStar size={10} style={{ color: "var(--lime)" }} />
        {firm.rating_avg.toFixed(1)}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Comparison Table                                                   */
/* ================================================================== */

function ComparisonTable({ firms }: { firms: Firm[] }) {
  const gridCols = `200px repeat(${firms.length}, 1fr)`;

  return (
    <div className="pt-compare-table">
      {/* Header */}
      <div className="pt-compare-table-head" style={{ gridTemplateColumns: gridCols }}>
        <div className="pt-compare-table-head-cell">
          <IconCompare size={20} style={{ opacity: 0.5 }} />
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }}>
            Compare
          </span>
        </div>
        {firms.map((firm) => (
          <div key={firm.id} className="pt-compare-table-head-cell">
            <div
              className="pt-compare-head-logo"
              style={{ background: firm.logo_color ?? "var(--g600)" }}
            >
              {firm.logo_text ?? firm.name.charAt(0)}
            </div>
            <div className="pt-compare-head-name">{firm.name}</div>
            <Badge variant={firm.rating_avg >= 4.5 ? "lime" : firm.rating_avg >= 4.0 ? "green" : ""}>
              {firm.rating_avg.toFixed(1)} / 5
            </Badge>
          </div>
        ))}
      </div>

      {/* Groups & Rows */}
      {COMPARE_GROUPS.map((group) => (
        <div key={group.title} className="pt-compare-group">
          <div className="pt-compare-group-title">{group.title}</div>
          {group.rows.map((row) => {
            const { bestIndex, worstIndex } = getBestWorst(firms, row.getNumeric, row.direction);
            return (
              <div
                key={row.key}
                className="pt-compare-row"
                style={{ gridTemplateColumns: gridCols }}
              >
                <div className="pt-compare-row-label">
                  {row.icon}
                  {row.label}
                </div>
                {firms.map((firm, i) => {
                  const isBest = bestIndex === i;
                  const isWorst = worstIndex === i;
                  return (
                    <div
                      key={firm.id}
                      className={`pt-compare-row-val ${isBest ? "best" : ""} ${isWorst ? "worst" : ""}`}
                    >
                      {row.getValue(firm)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Verdict Section                                                    */
/* ================================================================== */

function VerdictSection({ firms }: { firms: Firm[] }) {
  const { verdicts, totalMetrics } = useMemo(() => computeVerdicts(firms), [firms]);
  const winner = verdicts.reduce((a, b) => (b.score > a.score ? b : a), verdicts[0]);
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(() => {
    const slugs = firms.map((f) => f.slug).join(",");
    const url = `${window.location.origin}/compare?firms=${slugs}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [firms]);

  return (
    <div className="pt-compare-verdict">
      <div className="pt-compare-verdict-header">
        <IconAward size={22} style={{ color: "var(--lime)" }} />
        <span style={{ fontWeight: 700, fontSize: 16 }}>Verdict</span>
      </div>
      <div className="pt-compare-verdict-body">
        <p style={{ fontSize: 14, color: "var(--g600)", marginBottom: 4 }}>
          Based on {totalMetrics} comparable metrics:
        </p>
        <p style={{ fontSize: 16, fontWeight: 700 }}>
          {winner.firm.name} leads in {winner.score} of {totalMetrics} categories
        </p>

        <div
          className="pt-compare-verdict-grid"
          style={{ gridTemplateColumns: `repeat(${firms.length}, 1fr)` }}
        >
          {verdicts.map((v) => (
            <div key={v.firm.id} className="pt-compare-verdict-card">
              <div
                className="pt-compare-verdict-icon"
                style={{ background: v.firm.logo_color ?? "var(--g600)" }}
              >
                {v.firm.logo_text ?? v.firm.name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                  {v.firm.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--g400)", marginBottom: 8 }}>
                  Best in {v.score} metric{v.score !== 1 ? "s" : ""}
                </div>
                {v.strengths.length > 0 ? (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {v.strengths.map((s) => (
                      <li
                        key={s}
                        style={{
                          fontSize: 12,
                          color: "var(--green)",
                          fontWeight: 600,
                          marginBottom: 2,
                        }}
                      >
                        + {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: 12, color: "var(--g300)", fontStyle: "italic" }}>
                    No leading metrics
                  </p>
                )}
                {/* Rating bar */}
                <div className="pt-compare-rating-bar" style={{ marginTop: 8 }}>
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className="pt-compare-rating-seg"
                      style={{
                        background:
                          i < Math.round((v.score / Math.max(totalMetrics, 1)) * 10)
                            ? (v.firm.logo_color ?? "var(--lime)")
                            : "var(--g200)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-compare-share">
          <Button variant="ghost" noIcon onClick={handleShare}>
            <IconShare size={14} style={{ marginRight: 6 }} />
            {copied ? "Copied!" : "Copy Link"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Main Page                                                          */
/* ================================================================== */

export default function ComparePage() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const router = useRouter();
  const { data: allFirms, isLoading } = useFirms(supabase);

  const [view, setView] = useState<"select" | "compare">("select");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  /* ── Read URL params on mount ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const firmsParam = params.get("firms");
    if (firmsParam) {
      const slugs = firmsParam.split(",").filter(Boolean);
      if (slugs.length >= 2 && slugs.length <= 4) {
        setSelectedSlugs(slugs);
        setView("compare");
      }
    }
  }, []);

  /* ── Derived state ── */
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

  /* ── Handlers ── */
  const toggleFirm = useCallback((slug: string) => {
    setSelectedSlugs((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= 4) return prev;
      return [...prev, slug];
    });
  }, []);

  const handleCompare = useCallback(() => {
    router.replace(`/compare?firms=${selectedSlugs.join(",")}`);
    setView("compare");
  }, [router, selectedSlugs]);

  const handleBack = useCallback(() => {
    router.replace("/compare");
    setView("select");
  }, [router]);

  /* ── Render ── */
  return (
    <div className="pt-container">
      <div className="pt-page-header" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <h1 className="pt-page-title" style={{ margin: 0 }}>Compare Firms</h1>
        <Badge variant="lime">{selectedSlugs.length} selected</Badge>
      </div>

      {/* ═══════════════════════════ SELECTION VIEW ═══════════════════════════ */}
      {view === "select" && (
        <>
          {/* Search */}
          <div style={{ position: "relative", marginBottom: 20, maxWidth: 400 }}>
            <IconSearch
              size={16}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--g400)",
              }}
            />
            <input
              className="pt-input"
              placeholder="Search firms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>

          {/* Hint */}
          <p style={{ fontSize: 13, color: "var(--g400)", marginBottom: 16 }}>
            {selectedSlugs.length === 0
              ? "Select 2\u20134 firms to compare side by side"
              : selectedSlugs.length === 1
                ? "Select at least one more firm to compare"
                : `${selectedSlugs.length} firm${selectedSlugs.length !== 1 ? "s" : ""} selected (max 4)`}
          </p>

          {/* Picker Grid */}
          {isLoading ? (
            <div className="pt-compare-selector">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} height={120} borderRadius="var(--r-md)" />
              ))}
            </div>
          ) : filteredFirms.length === 0 ? (
            <EmptyState
              title="No firms found"
              description={searchQuery ? `No results for "${searchQuery}"` : "No firms available"}
            />
          ) : (
            <div className="pt-compare-selector">
              {filteredFirms.map((firm) => (
                <FirmPickCard
                  key={firm.id}
                  firm={firm}
                  selected={selectedSlugs.includes(firm.slug)}
                  onToggle={() => toggleFirm(firm.slug)}
                />
              ))}
            </div>
          )}

          {/* Compare Button */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
            <Button
              variant="lime"
              disabled={selectedSlugs.length < 2}
              onClick={handleCompare}
              icon={<IconCompare size={14} />}
            >
              Compare {selectedSlugs.length} Firm{selectedSlugs.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </>
      )}

      {/* ═══════════════════════════ COMPARISON VIEW ═══════════════════════════ */}
      {view === "compare" && (
        <>
          {/* Back button */}
          <div style={{ marginBottom: 20 }}>
            <Button variant="ghost" noIcon onClick={handleBack}>
              <IconArrow
                size={14}
                style={{ transform: "rotate(180deg)", marginRight: 6 }}
              />
              Change Selection
            </Button>
          </div>

          {comparedFirms.length < 2 ? (
            /* Loading state when URL params present but firms haven't loaded yet */
            <div className="pt-compare-table" style={{ padding: 40, textAlign: "center" }}>
              <Skeleton height={300} borderRadius="var(--r-md)" />
            </div>
          ) : (
            <>
              <ComparisonTable firms={comparedFirms} />
              <VerdictSection firms={comparedFirms} />
            </>
          )}
        </>
      )}
    </div>
  );
}
