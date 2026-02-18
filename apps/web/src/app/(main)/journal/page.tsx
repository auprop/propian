"use client";

import { useMemo, useCallback, useRef, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { FilterChip } from "@/components/ui/FilterChip";
import {
  IconBook,
  IconChevDown,
  IconClose,
  IconTrendUp,
} from "@propian/shared/icons";
import {
  useSession,
  useTrades,
  useLogTrade,
  useTradeStats,
  useTradeHeatmap,
  useDeleteTrade,
} from "@propian/shared/hooks";
import { logTradeSchema } from "@propian/shared/validation";
import type { LogTradeInput } from "@propian/shared/validation";
import type { Trade, TradeStats, TradeFilter, TradeHeatmapDay } from "@propian/shared/types";
import { allInstruments } from "@propian/shared/constants";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatCurrency } from "@propian/shared/utils";

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const EMOTIONS = [
  { value: "confident", emoji: "\u{1F60E}", label: "Confident" },
  { value: "neutral", emoji: "\u{1F610}", label: "Neutral" },
  { value: "fearful", emoji: "\u{1F628}", label: "Fearful" },
  { value: "greedy", emoji: "\u{1F911}", label: "Greedy" },
  { value: "revenge", emoji: "\u{1F624}", label: "Revenge" },
] as const;

const SETUPS = [
  "Breakout", "Pullback", "Reversal", "Trend Follow", "Range",
  "Supply/Demand", "Order Block", "FVG", "Liquidity Sweep", "News",
];

const MISTAKES = [
  "Early Entry", "Late Entry", "No Stop Loss", "Moved SL",
  "Over-leveraged", "Revenge Trade", "FOMO", "Ignored Plan",
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ================================================================== */
/*  Stats Row Component                                                */
/* ================================================================== */

function StatsRow({ stats, isLoading }: { stats?: TradeStats; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="pt-journal-stats">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="pt-journal-stat">
            <Skeleton width={60} height={26} borderRadius={4} />
            <div style={{ marginTop: 6 }}><Skeleton width={80} height={12} borderRadius={4} /></div>
          </div>
        ))}
      </div>
    );
  }

  const items = [
    { label: "Total Trades", value: String(stats?.total_trades ?? 0), sub: `${stats?.win_count ?? 0}W / ${stats?.loss_count ?? 0}L`, color: undefined },
    { label: "Win Rate", value: `${(stats?.win_rate ?? 0).toFixed(1)}%`, sub: null, color: (stats?.win_rate ?? 0) >= 50 ? "var(--green)" : "var(--red)" },
    { label: "Avg R:R", value: `${(stats?.avg_rr ?? 0).toFixed(2)}`, sub: null, color: undefined },
    { label: "Net P&L", value: formatCurrency(stats?.total_pnl ?? 0), sub: null, color: (stats?.total_pnl ?? 0) >= 0 ? "var(--green)" : "var(--red)" },
    { label: "Profit Factor", value: stats?.profit_factor === Infinity ? "\u221E" : (stats?.profit_factor ?? 0).toFixed(2), sub: null, color: undefined },
  ];

  return (
    <div className="pt-journal-stats">
      {items.map((item) => (
        <div key={item.label} className="pt-journal-stat">
          <div className="pt-journal-stat-val" style={item.color ? { color: item.color } : undefined}>
            {item.value}
          </div>
          <div className="pt-journal-stat-label">{item.label}</div>
          {item.sub && <div className="pt-journal-stat-sub" style={{ color: "var(--g400)" }}>{item.sub}</div>}
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Trade Row Component                                                */
/* ================================================================== */

function TradeRow({
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
  const pnlClass = (trade.pnl ?? 0) > 0 ? "positive" : (trade.pnl ?? 0) < 0 ? "negative" : "";
  const dirClass = trade.direction === "long" ? "buy" : "sell";
  const emotionEmoji = EMOTIONS.find((e) => e.value === trade.emotion)?.emoji ?? "";

  return (
    <div className="pt-trade-row">
      <div className="pt-trade-row-main" onClick={onToggle}>
        <div className="pt-trade-row-pair">{trade.pair}</div>
        <div className={`pt-trade-row-dir ${dirClass}`}>
          {trade.direction === "long" ? "BUY" : "SELL"}
        </div>
        <div style={{ fontSize: 12, fontFamily: "var(--mono)" }}>
          {trade.entry_price} &rarr; {trade.exit_price ?? "\u2014"}
        </div>
        <div className={`pt-trade-row-pnl ${pnlClass}`}>
          {trade.pnl != null ? formatCurrency(trade.pnl) : "\u2014"}
        </div>
        <div className="pt-trade-row-rr">
          {trade.rr_ratio != null ? `${trade.rr_ratio.toFixed(2)}R` : "\u2014"}
        </div>
        <div className="pt-trade-row-time">
          {new Date(trade.trade_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
        <div className="pt-trade-row-emotion">{emotionEmoji}</div>
        <button className="pt-trade-row-expand" style={{ transform: isExpanded ? "rotate(180deg)" : "none" }}>
          <IconChevDown size={16} />
        </button>
      </div>

      {isExpanded && (
        <div className="pt-trade-detail">
          <div className="pt-trade-detail-inner">
            <div>
              <div className="pt-trade-detail-section">
                <div className="pt-trade-detail-label">Trade Details</div>
                <div className="pt-trade-detail-grid">
                  <div className="pt-trade-detail-item">
                    <div className="pt-trade-detail-item-label">Entry</div>
                    <div className="pt-trade-detail-item-val">{trade.entry_price}</div>
                  </div>
                  <div className="pt-trade-detail-item">
                    <div className="pt-trade-detail-item-label">Exit</div>
                    <div className="pt-trade-detail-item-val">{trade.exit_price ?? "\u2014"}</div>
                  </div>
                  <div className="pt-trade-detail-item">
                    <div className="pt-trade-detail-item-label">Lot Size</div>
                    <div className="pt-trade-detail-item-val">{trade.lot_size}</div>
                  </div>
                  <div className="pt-trade-detail-item">
                    <div className="pt-trade-detail-item-label">Stop Loss</div>
                    <div className="pt-trade-detail-item-val">{trade.stop_loss ?? "\u2014"}</div>
                  </div>
                  <div className="pt-trade-detail-item">
                    <div className="pt-trade-detail-item-label">Take Profit</div>
                    <div className="pt-trade-detail-item-val">{trade.take_profit ?? "\u2014"}</div>
                  </div>
                  <div className="pt-trade-detail-item">
                    <div className="pt-trade-detail-item-label">Commission</div>
                    <div className="pt-trade-detail-item-val">{formatCurrency(trade.commission)}</div>
                  </div>
                </div>
              </div>

              {trade.notes && (
                <div className="pt-trade-detail-section">
                  <div className="pt-trade-detail-label">Notes</div>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--g600)" }}>{trade.notes}</p>
                </div>
              )}

              {trade.tags.length > 0 && (
                <div className="pt-trade-detail-section">
                  <div className="pt-trade-detail-label">Tags</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {trade.tags.map((tag) => (
                      <Badge key={tag} variant="lime">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {trade.mistakes.length > 0 && (
                <div className="pt-trade-detail-section">
                  <div className="pt-trade-detail-label">Mistakes</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {trade.mistakes.map((m) => (
                      <Badge key={m} variant="red">{m}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              {trade.screenshot_url && (
                <div className="pt-trade-detail-section">
                  <div className="pt-trade-detail-label">Screenshot</div>
                  <div className="pt-trade-screenshot">
                    <img
                      src={trade.screenshot_url}
                      alt="Trade screenshot"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                </div>
              )}

              {trade.setup && (
                <div className="pt-trade-detail-section">
                  <div className="pt-trade-detail-label">Setup</div>
                  <Badge>{trade.setup}</Badge>
                </div>
              )}

              {trade.emotion && (
                <div className="pt-trade-detail-section">
                  <div className="pt-trade-detail-label">Emotion</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 24 }}>{emotionEmoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{trade.emotion}</span>
                  </div>
                </div>
              )}

              {trade.confidence != null && (
                <div className="pt-trade-detail-section">
                  <div className="pt-trade-detail-label">Confidence</div>
                  <div className="pt-confidence-bar">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className={`pt-confidence-seg ${i <= (trade.confidence ?? 0) ? "filled" : ""}`} />
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <Button variant="danger" size="sm" noIcon onClick={() => onDelete(trade.id)}>
                  Delete Trade
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Trade Row Skeleton                                                 */
/* ================================================================== */

function TradeRowSkeleton() {
  return (
    <div className="pt-trade-row">
      <div className="pt-trade-row-main" style={{ cursor: "default" }}>
        <Skeleton width={70} height={14} borderRadius={4} />
        <Skeleton width={36} height={20} borderRadius={12} />
        <Skeleton width={120} height={12} borderRadius={4} />
        <Skeleton width={60} height={14} borderRadius={4} />
        <Skeleton width={40} height={12} borderRadius={4} />
        <Skeleton width={50} height={12} borderRadius={4} />
        <Skeleton width={20} height={20} borderRadius={4} />
        <Skeleton width={16} height={16} borderRadius={4} />
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Heatmap Calendar Component                                         */
/* ================================================================== */

function HeatmapCalendar({
  heatmapData,
  year,
  month,
  onMonthChange,
}: {
  heatmapData: TradeHeatmapDay[];
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
}) {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const heatmapMap = useMemo(() => {
    const map = new Map<number, TradeHeatmapDay>();
    for (const day of heatmapData) {
      const d = new Date(day.date);
      map.set(d.getDate(), day);
    }
    return map;
  }, [heatmapData]);

  const cells = [];
  for (let i = 0; i < startDow; i++) {
    cells.push(<div key={`empty-${i}`} className="pt-heatmap-cell empty" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dayData = heatmapMap.get(d);
    let cellClass = "pt-heatmap-cell no-trade";
    let bgColor: string | undefined;

    if (dayData) {
      if (dayData.pnl > 0) {
        cellClass = "pt-heatmap-cell win";
        const intensity = Math.min(dayData.pnl / 500, 1);
        bgColor = `rgba(34, 197, 94, ${0.3 + intensity * 0.7})`;
      } else if (dayData.pnl < 0) {
        cellClass = "pt-heatmap-cell loss";
        const intensity = Math.min(Math.abs(dayData.pnl) / 500, 1);
        bgColor = `rgba(239, 68, 68, ${0.3 + intensity * 0.7})`;
      } else {
        cellClass = "pt-heatmap-cell";
        bgColor = "var(--g200)";
      }
    }

    cells.push(
      <div
        key={d}
        className={cellClass}
        style={bgColor ? { background: bgColor } : undefined}
        title={dayData ? `${dayData.trade_count} trade${dayData.trade_count > 1 ? "s" : ""}: ${formatCurrency(dayData.pnl)}` : undefined}
      >
        {d}
      </div>
    );
  }

  const monthLabel = new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="pt-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button
          onClick={() => onMonthChange(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4 }}
        >
          &lsaquo;
        </button>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{monthLabel}</span>
        <button
          onClick={() => onMonthChange(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4 }}
        >
          &rsaquo;
        </button>
      </div>
      <div className="pt-heatmap">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pt-heatmap-header">{d}</div>
        ))}
        {cells}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Log Trade Modal                                                    */
/* ================================================================== */

function LogTradeModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  isSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LogTradeInput) => void;
  isPending: boolean;
  isSuccess: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LogTradeInput>({
    resolver: zodResolver(logTradeSchema),
    defaultValues: {
      direction: "long",
      lot_size: 0.01,
      status: "closed",
      tags: [],
      mistakes: [],
      commission: 0,
      swap: 0,
      trade_date: new Date().toISOString().split("T")[0],
    },
  });

  // Reset form when save succeeds
  useEffect(() => {
    if (isSuccess) reset();
  }, [isSuccess, reset]);

  const selectedEmotion = watch("emotion");
  const selectedConfidence = watch("confidence");
  const selectedSetup = watch("setup");
  const selectedTags = watch("tags") ?? [];
  const selectedMistakes = watch("mistakes") ?? [];
  const direction = watch("direction");
  const currentStatus = watch("status");

  const toggleTag = (tag: string) => {
    const current = selectedTags;
    setValue("tags", current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]);
  };

  const toggleMistake = (mistake: string) => {
    const current = selectedMistakes;
    setValue("mistakes", current.includes(mistake) ? current.filter((m) => m !== mistake) : [...current, mistake]);
  };

  const onFormSubmit = handleSubmit(
    (data) => {
      onSubmit(data);
    },
    (fieldErrors) => {
      console.error("Form validation failed:", fieldErrors);
    },
  );

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,.5)", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--white)", borderRadius: "var(--r-lg)",
          border: "var(--brd)", maxWidth: 680, width: "100%",
          maxHeight: "85vh", overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "20px 24px", borderBottom: "var(--brd-l)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Log Trade</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <IconClose size={20} />
          </button>
        </div>

        <form onSubmit={onFormSubmit} style={{ padding: 24 }}>
          {/* Pair & Direction */}
          <div style={{ marginBottom: 20 }}>
            <div className="pt-trade-form-title">Instrument &amp; Direction</div>
            <div className="pt-trade-form-row">
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--g400)", marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Trading Pair
                </label>
                <select
                  {...register("pair")}
                  style={{
                    width: "100%", padding: "10px 12px", border: "var(--brd)",
                    borderRadius: "var(--r-sm)", fontSize: 14, fontFamily: "var(--font)",
                    background: "var(--white)", cursor: "pointer",
                  }}
                >
                  <option value="">Select pair...</option>
                  {allInstruments.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {errors.pair && <p style={{ color: "var(--red)", fontSize: 12, marginTop: 4 }}>{errors.pair.message}</p>}
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--g400)", marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Direction
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setValue("direction", "long")}
                    style={{
                      flex: 1, padding: "10px 16px", border: "var(--brd)", borderRadius: "var(--r-sm)",
                      fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "var(--font)",
                      background: direction === "long" ? "var(--green)" : "var(--white)",
                      color: direction === "long" ? "var(--white)" : "var(--black)",
                    }}
                  >
                    LONG
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue("direction", "short")}
                    style={{
                      flex: 1, padding: "10px 16px", border: "var(--brd)", borderRadius: "var(--r-sm)",
                      fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "var(--font)",
                      background: direction === "short" ? "var(--red)" : "var(--white)",
                      color: direction === "short" ? "var(--white)" : "var(--black)",
                    }}
                  >
                    SHORT
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Prices */}
          <div style={{ marginBottom: 20 }}>
            <div className="pt-trade-form-title">Price Levels</div>
            <div className="pt-trade-form-grid">
              <Input label="Entry Price" type="number" step="any" {...register("entry_price")} error={errors.entry_price?.message} />
              <Input label="Exit Price" type="number" step="any" {...register("exit_price")} />
              <Input label="Lot Size" type="number" step="0.01" {...register("lot_size")} />
              <Input label="Stop Loss" type="number" step="any" {...register("stop_loss")} />
              <Input label="Take Profit" type="number" step="any" {...register("take_profit")} />
              <Input label="Trade Date" type="date" {...register("trade_date")} />
            </div>
          </div>

          {/* P&L */}
          <div style={{ marginBottom: 20 }}>
            <div className="pt-trade-form-title">Results</div>
            <div className="pt-trade-form-grid">
              <Input label="P&L ($)" type="number" step="0.01" {...register("pnl")} />
              <Input label="P&L (pips)" type="number" step="0.1" {...register("pnl_pips")} />
              <Input label="R:R Ratio" type="number" step="0.01" {...register("rr_ratio")} />
            </div>
            <div className="pt-trade-form-row" style={{ marginTop: 12 }}>
              <Input label="Commission" type="number" step="0.01" {...register("commission")} />
              <Input label="Swap" type="number" step="0.01" {...register("swap")} />
            </div>
          </div>

          {/* Status */}
          <div style={{ marginBottom: 20 }}>
            <div className="pt-trade-form-title">Status</div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["closed", "open", "breakeven"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setValue("status", s)}
                  className={`pt-trade-setup-tag ${currentStatus === s ? "selected" : ""}`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Setup (single select) */}
          <div style={{ marginBottom: 20 }}>
            <div className="pt-trade-form-title">Setup</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SETUPS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setValue("setup", selectedSetup === s ? null : s)}
                  className={`pt-trade-setup-tag ${selectedSetup === s ? "selected" : ""}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Mistakes */}
          <div style={{ marginBottom: 20 }}>
            <div className="pt-trade-form-title">Mistakes</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {MISTAKES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMistake(m)}
                  className={`pt-trade-setup-tag mistake ${selectedMistakes.includes(m) ? "selected" : ""}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Emotion */}
          <div style={{ marginBottom: 20 }}>
            <div className="pt-trade-form-title">How did you feel?</div>
            <div className="pt-emotion-bar">
              {EMOTIONS.map((e) => (
                <button
                  key={e.value}
                  type="button"
                  onClick={() => setValue("emotion", selectedEmotion === e.value ? null : e.value)}
                  className={`pt-emotion-btn ${selectedEmotion === e.value ? "active" : ""}`}
                  title={e.label}
                >
                  {e.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Confidence */}
          <div style={{ marginBottom: 20 }}>
            <div className="pt-trade-form-title">Confidence Level</div>
            <div className="pt-confidence-bar" style={{ maxWidth: 200 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`pt-confidence-seg ${(selectedConfidence ?? 0) >= i ? "filled" : ""}`}
                  onClick={() => setValue("confidence", selectedConfidence === i ? null : i)}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 24 }}>
            <div className="pt-trade-form-title">Notes</div>
            <textarea
              {...register("notes")}
              rows={3}
              placeholder="What did you learn from this trade?"
              style={{
                width: "100%", padding: "10px 12px", border: "var(--brd)",
                borderRadius: "var(--r-sm)", fontSize: 14, fontFamily: "var(--font)",
                resize: "vertical", minHeight: 80,
              }}
            />
          </div>

          {/* Submit */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <Button variant="ghost" type="button" noIcon onClick={onClose}>Cancel</Button>
            <Button variant="lime" type="submit" noIcon disabled={isPending}>
              {isPending ? "Saving..." : "Save Trade"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Main Journal Page                                                  */
/* ================================================================== */

export default function JournalPage() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const { data: session } = useSession(supabase);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const now = new Date();
  const [heatmapYear, setHeatmapYear] = useState(now.getFullYear());
  const [heatmapMonth, setHeatmapMonth] = useState(now.getMonth() + 1);

  const filters: TradeFilter | undefined = useMemo(() => {
    if (statusFilter === "all") return undefined;
    return { status: statusFilter as TradeFilter["status"] };
  }, [statusFilter]);

  const {
    data: tradesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: tradesLoading,
    isError: tradesError,
  } = useTrades(supabase, filters);

  const { data: stats, isLoading: statsLoading } = useTradeStats(supabase);
  const { data: heatmapData } = useTradeHeatmap(supabase, heatmapYear, heatmapMonth);

  const logTrade = useLogTrade(supabase);
  const deleteTrade = useDeleteTrade(supabase);

  const trades: Trade[] = tradesData?.pages.flatMap((page) => page.data ?? []) ?? [];

  const handleLogTrade = useCallback(
    (data: LogTradeInput) => {
      // Convert undefined → null for optional fields (Trade type uses null, not undefined)
      const trade = {
        ...data,
        exit_price: data.exit_price ?? null,
        stop_loss: data.stop_loss ?? null,
        take_profit: data.take_profit ?? null,
        pnl: data.pnl ?? null,
        pnl_pips: data.pnl_pips ?? null,
        rr_ratio: data.rr_ratio ?? null,
        screenshot_url: data.screenshot_url ?? null,
        notes: data.notes ?? null,
        setup: data.setup ?? null,
        emotion: data.emotion ?? null,
        confidence: data.confidence ?? null,
        closed_at: data.status === "closed" ? new Date().toISOString() : null,
      };
      logTrade.mutate(trade, {
        onSuccess: () => setShowModal(false),
        onError: (err: unknown) => {
          // Supabase PostgrestError is a plain object with { message, details, hint, code }
          const msg =
            (err && typeof err === "object" && "message" in err) ? String((err as { message: string }).message)
            : err instanceof Error ? err.message
            : JSON.stringify(err);
          console.error("Failed to save trade:", msg, err);
          alert("Failed to save trade: " + msg);
        },
      });
    },
    [logTrade],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (confirm("Delete this trade?")) {
        deleteTrade.mutate(id);
        setExpandedId(null);
      }
    },
    [deleteTrade],
  );

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <section className="pt-section">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
            <IconBook size={24} style={{ color: "var(--lime)" }} />
            Trading Journal
          </h1>
          <p style={{ fontSize: 14, color: "var(--g400)", marginTop: 4 }}>
            Log, review, and learn from every trade
          </p>
        </div>
        <Button variant="lime" onClick={() => setShowModal(true)}>
          Log Trade
        </Button>
      </div>

      {/* Stats */}
      <StatsRow stats={stats} isLoading={statsLoading} />

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["all", "open", "closed", "breakeven"].map((s) => (
          <FilterChip
            key={s}
            label={s === "all" ? "All Trades" : s.charAt(0).toUpperCase() + s.slice(1)}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          />
        ))}
      </div>

      {/* Main layout */}
      <div className="pt-feed-layout">
        <div>
          {tradesLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {Array.from({ length: 5 }).map((_, i) => <TradeRowSkeleton key={i} />)}
            </div>
          )}

          {tradesError && (
            <EmptyState
              title="Failed to load trades"
              description="Something went wrong. Please try again later."
            />
          )}

          {!tradesLoading && !tradesError && trades.length === 0 && (
            <EmptyState
              icon={<IconBook size={32} />}
              title="No trades logged yet"
              description="Start logging your trades to track performance and identify patterns."
              action={
                <Button variant="lime" onClick={() => setShowModal(true)}>
                  Log Your First Trade
                </Button>
              }
            />
          )}

          {trades.map((trade) => (
            <TradeRow
              key={trade.id}
              trade={trade}
              isExpanded={expandedId === trade.id}
              onToggle={() => setExpandedId(expandedId === trade.id ? null : trade.id)}
              onDelete={handleDelete}
            />
          ))}

          <div ref={sentinelRef} style={{ height: 1 }} />
          {isFetchingNextPage && <TradeRowSkeleton />}
        </div>

        <aside>
          <HeatmapCalendar
            heatmapData={heatmapData ?? []}
            year={heatmapYear}
            month={heatmapMonth}
            onMonthChange={(y, m) => { setHeatmapYear(y); setHeatmapMonth(m); }}
          />

          {stats && stats.total_trades > 0 && (
            <div className="pt-card" style={{ padding: 16, marginTop: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <IconTrendUp size={16} style={{ color: "var(--lime)" }} />
                Performance
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--g400)" }}>Best Trade</span>
                  <span style={{ fontWeight: 700, fontFamily: "var(--mono)", color: "var(--green)" }}>
                    {formatCurrency(stats.best_trade)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--g400)" }}>Worst Trade</span>
                  <span style={{ fontWeight: 700, fontFamily: "var(--mono)", color: "var(--red)" }}>
                    {formatCurrency(stats.worst_trade)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--g400)" }}>Avg Win</span>
                  <span style={{ fontWeight: 700, fontFamily: "var(--mono)", color: "var(--green)" }}>
                    {formatCurrency(stats.avg_win)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--g400)" }}>Avg Loss</span>
                  <span style={{ fontWeight: 700, fontFamily: "var(--mono)", color: "var(--red)" }}>
                    -{formatCurrency(stats.avg_loss)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      <LogTradeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleLogTrade}
        isPending={logTrade.isPending}
        isSuccess={logTrade.isSuccess}
      />
    </section>
  );
}
