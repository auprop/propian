"use client";

import { useMemo, useState, useCallback } from "react";
import {
  useEconomicEvents,
  useWeekDays,
  useMonthlyEvents,
  useEventAlerts,
  useToggleEventAlert,
} from "@propian/shared/hooks";
import { getAffectedPairs } from "@propian/shared/api";
import type {
  EconomicEvent,
  EventImpact,
  CalendarWeekDay,
} from "@propian/shared/types";
import { IconBell, IconShare, IconChart } from "@propian/shared/icons";
import { Badge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";
import { createBrowserClient } from "@/lib/supabase/client";

/* ================================================================== */
/*  Constants                                                            */
/* ================================================================== */

const FLAGS: Record<string, string> = {
  all: "\uD83C\uDF0D", us: "\uD83C\uDDFA\uD83C\uDDF8", eu: "\uD83C\uDDEA\uD83C\uDDFA",
  gb: "\uD83C\uDDEC\uD83C\uDDE7", jp: "\uD83C\uDDEF\uD83C\uDDF5", au: "\uD83C\uDDE6\uD83C\uDDFA",
  ca: "\uD83C\uDDE8\uD83C\uDDE6", ch: "\uD83C\uDDE8\uD83C\uDDED", nz: "\uD83C\uDDF3\uD83C\uDDFF",
  cn: "\uD83C\uDDE8\uD83C\uDDF3",
};

const IMPACT_COLORS: Record<EventImpact, string> = {
  high: "var(--red)",
  medium: "var(--amber)",
  low: "var(--green)",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ================================================================== */
/*  Helpers                                                              */
/* ================================================================== */

function impactBars(impact: EventImpact) {
  const level = impact === "high" ? 3 : impact === "medium" ? 2 : 1;
  return (
    <div className="pt-cal-event-impact" title={impact}>
      {[1, 2, 3].map((b) => (
        <div
          key={b}
          className={`pt-cal-event-impact-bar${b <= level ? ` filled ${impact}` : ""}`}
        />
      ))}
    </div>
  );
}

function getCountdownText(date: string, time: string): string | null {
  const eventTime = new Date(date + "T" + time + ":00Z");
  const now = new Date();
  const diff = eventTime.getTime() - now.getTime();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${mins}m`;
}

function getSelectedDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

/* ================================================================== */
/*  View Toggle & Filters                                                */
/* ================================================================== */

type CalView = "timeline" | "monthly" | "alerts";

function ViewToggle({ view, setView }: { view: CalView; setView: (v: CalView) => void }) {
  return (
    <div style={{ display: "flex", gap: 0, border: "var(--brd)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
      {(["timeline", "monthly", "alerts"] as CalView[]).map((v) => (
        <button
          key={v}
          style={{
            padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            border: "none", background: view === v ? "var(--black)" : "var(--g100)",
            color: view === v ? "var(--lime)" : "var(--g500)",
            fontFamily: "var(--font)", transition: "all .15s ease",
            borderRight: v !== "alerts" ? "var(--brd)" : "none",
          }}
          onClick={() => setView(v)}
        >
          {v.charAt(0).toUpperCase() + v.slice(1)}
        </button>
      ))}
    </div>
  );
}

function ImpactFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { k: "all", l: "All" },
    { k: "high", l: "\uD83D\uDD34 High" },
    { k: "medium", l: "\uD83D\uDFE1 Med" },
    { k: "low", l: "\uD83D\uDFE2 Low" },
  ];
  return (
    <div style={{ display: "flex", gap: 0, border: "var(--brd)", borderRadius: "var(--r-full)", overflow: "hidden" }}>
      {options.map((f) => (
        <button
          key={f.k}
          style={{
            padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer",
            border: "none", background: value === f.k ? "var(--black)" : "var(--white)",
            color: value === f.k ? "var(--lime)" : "var(--g500)",
            fontFamily: "var(--font)", transition: "all .15s ease",
            borderRight: f.k !== "low" ? "var(--brd-l)" : "none",
          }}
          onClick={() => onChange(f.k)}
        >
          {f.l}
        </button>
      ))}
    </div>
  );
}

function CountryFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { k: "all", l: "\uD83C\uDF0D All" },
    { k: "us", l: "\uD83C\uDDFA\uD83C\uDDF8" },
    { k: "eu", l: "\uD83C\uDDEA\uD83C\uDDFA" },
    { k: "gb", l: "\uD83C\uDDEC\uD83C\uDDE7" },
    { k: "jp", l: "\uD83C\uDDEF\uD83C\uDDF5" },
    { k: "au", l: "\uD83C\uDDE6\uD83C\uDDFA" },
  ];
  return (
    <div style={{ display: "flex", gap: 0, border: "var(--brd)", borderRadius: "var(--r-full)", overflow: "hidden" }}>
      {options.map((f) => (
        <button
          key={f.k}
          style={{
            padding: "5px 10px", fontSize: f.k === "all" ? 11 : 14, fontWeight: 600, cursor: "pointer",
            border: "none", background: value === f.k ? "var(--black)" : "var(--white)",
            color: value === f.k ? "var(--lime)" : "var(--g500)",
            fontFamily: "var(--font)", transition: "all .15s ease",
            borderRight: f.k !== "au" ? "var(--brd-l)" : "none",
          }}
          onClick={() => onChange(f.k)}
        >
          {f.l}
        </button>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Week Strip                                                           */
/* ================================================================== */

function WeekStrip({
  weekDays,
  selectedDay,
  onSelectDay,
  isLoading,
}: {
  weekDays: CalendarWeekDay[];
  selectedDay: number;
  onSelectDay: (num: number, date: string) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="pt-sub">
        <Skeleton width="100%" height={80} borderRadius={8} />
      </div>
    );
  }

  return (
    <div className="pt-cal-week">
      {weekDays.map((d) => (
        <div
          key={d.num}
          className={`pt-cal-day ${selectedDay === d.num ? "active" : ""} ${d.today ? "today" : ""}`}
          onClick={() => onSelectDay(d.num, d.date)}
        >
          <div className="pt-cal-day-name">{d.day}</div>
          <div className="pt-cal-day-num">{d.num}</div>
          <div className="pt-cal-day-dots">
            {d.events.map((e, i) => (
              <div
                key={i}
                className="pt-cal-day-dot"
                style={{ background: IMPACT_COLORS[e] }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Event Card (expandable)                                              */
/* ================================================================== */

function EventCard({
  event,
  index,
  expanded,
  onToggle,
  alertOn,
  onToggleAlert,
}: {
  event: EconomicEvent;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  alertOn: boolean;
  onToggleAlert: () => void;
}) {
  const countdown = getCountdownText(event.date, event.time);

  return (
    <div className="pt-cal-event">
      <div className="pt-cal-event-main" onClick={onToggle}>
        {/* Time */}
        <span className="pt-cal-event-time">{event.time}</span>
        {/* Flag */}
        <span className="pt-cal-event-flag">{FLAGS[event.country] ?? ""}</span>
        {/* Info */}
        <div className="pt-cal-event-info">
          <div className="pt-cal-event-name">{event.name}</div>
          <div className="pt-cal-event-currency">
            {event.currency}{" "}
            {countdown && (
              <span className="pt-cal-countdown">
                <span className="pt-cal-countdown-dot" /> {countdown}
              </span>
            )}
          </div>
        </div>
        {/* Impact */}
        {impactBars(event.impact)}
        {/* Values */}
        <div className="pt-cal-event-values">
          <div className="pt-cal-event-val">
            <div className="pt-cal-event-val-label">Actual</div>
            <div className={`pt-cal-event-val-num ${event.actualDirection ?? ""}`}>
              {event.actual ?? "\u2014"}
            </div>
          </div>
          <div className="pt-cal-event-val">
            <div className="pt-cal-event-val-label">Forecast</div>
            <div className="pt-cal-event-val-num">{event.forecast ?? "\u2014"}</div>
          </div>
          <div className="pt-cal-event-val">
            <div className="pt-cal-event-val-label">Previous</div>
            <div className="pt-cal-event-val-num">{event.previous ?? "\u2014"}</div>
          </div>
        </div>
        {/* Alert bell */}
        <button
          className={`pt-cal-event-alert ${alertOn ? "on" : ""}`}
          onClick={(e) => { e.stopPropagation(); onToggleAlert(); }}
        >
          <IconBell size={16} />
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="pt-cal-event-detail">
          <div className="pt-cal-event-detail-inner">
            <div className="pt-cal-detail-row">
              <div className="pt-cal-detail-item">
                <div className="pt-cal-detail-label">Description</div>
                <div className="pt-cal-detail-val">{event.description}</div>
              </div>
            </div>

            {/* Analysis pending indicator */}
            {event.actual && !event.analysis && (
              <div style={{
                margin: "12px 0",
                padding: "12px 16px",
                background: "rgba(0,0,0,0.02)",
                border: "1px dashed var(--g200)",
                borderRadius: "var(--r-md)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <span style={{ fontSize: 14 }}>{"⏳"}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--g500)" }}>
                  AI analysis is being generated and will appear shortly...
                </span>
              </div>
            )}

            {/* Market Analysis (shown when actual is released) */}
            {event.analysis && (
              <div style={{
                margin: "12px 0",
                padding: 16,
                background: event.analysis.sentiment === "bullish" ? "rgba(34,197,94,0.06)"
                  : event.analysis.sentiment === "bearish" ? "rgba(255,68,68,0.06)"
                  : "rgba(0,0,0,0.03)",
                border: `1px solid ${event.analysis.sentiment === "bullish" ? "rgba(34,197,94,0.2)"
                  : event.analysis.sentiment === "bearish" ? "rgba(255,68,68,0.2)"
                  : "var(--g200)"}`,
                borderRadius: "var(--r-md)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 14 }}>
                    {event.analysis.sentiment === "bullish" ? "\uD83D\uDCC8" : event.analysis.sentiment === "bearish" ? "\uD83D\uDCC9" : "\u2796"}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: event.analysis.sentiment === "bullish" ? "var(--green)" : event.analysis.sentiment === "bearish" ? "var(--red)" : "var(--g500)" }}>
                    Market Analysis
                  </span>
                  <Badge variant={event.analysis.sentiment === "bullish" ? "green" : event.analysis.sentiment === "bearish" ? "red" : ""}>
                    {event.analysis.sentiment.charAt(0).toUpperCase() + event.analysis.sentiment.slice(1)}
                  </Badge>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--g400)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Actual vs Forecast</div>
                    <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>{event.analysis.summary}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--g400)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Market Impact</div>
                    <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>{event.analysis.marketImpact}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--g400)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Trading Insight</div>
                    <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>{event.analysis.tradingInsight}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Post-Release Notes (bullet points) */}
            {event.notes && event.notes.bullets.length > 0 && (
              <div style={{
                margin: "12px 0",
                padding: 16,
                background: "rgba(0,0,0,0.02)",
                border: "2px solid var(--black)",
                borderRadius: "var(--r-md)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 14 }}>{"\uD83D\uDCCB"}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--black)" }}>
                    Post-Release Summary
                  </span>
                  <Badge variant={event.notes.priceAction === "bullish" ? "green" : event.notes.priceAction === "bearish" ? "red" : ""}>
                    {event.notes.priceAction.charAt(0).toUpperCase() + event.notes.priceAction.slice(1)} {event.currency}
                  </Badge>
                </div>
                <ul style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {event.notes.bullets.map((bullet, i) => (
                    <li key={i} style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: "var(--g700)" }}>{bullet}</li>
                  ))}
                </ul>
                {event.notes.keyTakeaway && (
                  <div style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    background: event.notes.priceAction === "bullish" ? "rgba(34,197,94,0.08)"
                      : event.notes.priceAction === "bearish" ? "rgba(255,68,68,0.08)"
                      : "rgba(0,0,0,0.04)",
                    borderRadius: "var(--r-sm)",
                    borderLeft: `3px solid ${event.notes.priceAction === "bullish" ? "var(--green)" : event.notes.priceAction === "bearish" ? "var(--red)" : "var(--g300)"}`,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--g400)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Key Takeaway</div>
                    <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>{event.notes.keyTakeaway}</div>
                  </div>
                )}
                {event.notes.affectedPairs.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "var(--g400)", textTransform: "uppercase", letterSpacing: 0.5 }}>Affected Pairs:</span>
                    {event.notes.affectedPairs.map((pair) => (
                      <span key={pair} style={{
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: "var(--ff-mono)",
                        padding: "2px 8px",
                        background: "var(--g100)",
                        borderRadius: "var(--r-sm)",
                        border: "1px solid var(--g200)",
                      }}>{pair}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pt-cal-detail-row">
              <div className="pt-cal-detail-item">
                <div className="pt-cal-detail-label">Impact on {event.currency}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    Typically {event.impact === "high" ? "50-100" : event.impact === "medium" ? "20-50" : "10-30"} pips
                  </span>
                  <Badge variant={event.impact === "high" ? "red" : event.impact === "medium" ? "amber" : "green"}>
                    {event.impact.charAt(0).toUpperCase() + event.impact.slice(1)} Volatility
                  </Badge>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="pt-btn ghost sm" onClick={(e) => { e.stopPropagation(); onToggleAlert(); }}>
                <IconBell size={14} />
                <span>{alertOn ? "Alert On" : "Set Alert"}</span>
              </button>
              <button className="pt-btn ghost sm">
                <IconShare size={12} />
                <span>Share</span>
              </button>
              <button className="pt-btn ghost sm">
                <IconChart size={14} />
                <span>View Chart</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Up Next Sidebar Card                                                 */
/* ================================================================== */

function UpNextCard({ events }: { events: EconomicEvent[] }) {
  const nextEvent = events.find((e) => {
    const cd = getCountdownText(e.date, e.time);
    return cd != null;
  });
  if (!nextEvent) return null;

  const countdown = getCountdownText(nextEvent.date, nextEvent.time) ?? "";
  const parts = countdown.split(" ");
  const timeUnits = parts.length >= 2
    ? [{ l: parts[0].endsWith("h") ? "Hours" : "Days", v: parts[0].replace(/[hd]/, "") }, { l: "Min", v: parts[1]?.replace("m", "") ?? "0" }]
    : [{ l: "Min", v: parts[0]?.replace("m", "") ?? "0" }];

  return (
    <div className="pt-sub">
      <p className="pt-sub-label">Up Next</p>
      <div style={{
        border: "var(--brd)", borderRadius: "var(--r-lg)", background: "var(--black)", color: "var(--white)", padding: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>{FLAGS[nextEvent.country]}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{nextEvent.name}</div>
            <div style={{ fontSize: 12, color: "var(--g400)" }}>
              {nextEvent.currency} &middot; {nextEvent.impact.charAt(0).toUpperCase() + nextEvent.impact.slice(1)} Impact
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 0, borderTop: "1px solid var(--g700)", paddingTop: 14 }}>
          {timeUnits.map((t) => (
            <div key={t.l} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--mono)", color: "var(--lime)", lineHeight: 1 }}>{t.v}</div>
              <div style={{ fontSize: 9, color: "var(--g500)", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>{t.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Today Summary Sidebar                                                */
/* ================================================================== */

function TodaySummary({ events }: { events: EconomicEvent[] }) {
  const highCount = events.filter((e) => e.impact === "high").length;
  const medCount = events.filter((e) => e.impact === "medium").length;
  const lowCount = events.filter((e) => e.impact === "low").length;
  const highReleased = events.filter((e) => e.impact === "high" && e.actual != null).length;
  const medReleased = events.filter((e) => e.impact === "medium" && e.actual != null).length;
  const lowReleased = events.filter((e) => e.impact === "low" && e.actual != null).length;

  const rows = [
    { label: "High Impact", count: highCount, released: highReleased, color: "var(--red)" },
    { label: "Medium Impact", count: medCount, released: medReleased, color: "var(--amber)" },
    { label: "Low Impact", count: lowCount, released: lowReleased, color: "var(--green)" },
  ];

  return (
    <div className="pt-sub">
      <p className="pt-sub-label">Today&apos;s Summary</p>
      <div style={{ border: "var(--brd)", borderRadius: "var(--r-lg)", background: "var(--white)", padding: 16 }}>
        {rows.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "var(--brd-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontFamily: "var(--mono)", fontWeight: 600 }}>{s.released}/{s.count}</span>
              <span style={{ fontSize: 10, color: "var(--g400)" }}>released</span>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, fontSize: 13, fontWeight: 600 }}>
          <span>Total Events</span>
          <span style={{ fontFamily: "var(--mono)" }}>{events.length}</span>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Affected Pairs Sidebar                                               */
/* ================================================================== */

function AffectedPairsSidebar({ events }: { events: EconomicEvent[] }) {
  const pairs = useMemo(() => getAffectedPairs(events), [events]);
  if (pairs.length === 0) return null;

  return (
    <div className="pt-sub">
      <p className="pt-sub-label">Affected Pairs</p>
      <div style={{ border: "var(--brd)", borderRadius: "var(--r-lg)", background: "var(--white)", padding: 16 }}>
        {pairs.map((p) => (
          <div key={p.pair} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "var(--brd-l)" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600 }}>{p.pair}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--g400)" }}>{p.events} events</span>
              <Badge variant={p.impact === "high" ? "red" : p.impact === "medium" ? "amber" : "green"}>
                {p.impact}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Monthly Calendar Grid View                                           */
/* ================================================================== */

function MonthlyGrid({
  year,
  month,
  monthEvents,
  onSelectDay,
  isLoading,
}: {
  year: number;
  month: number;
  monthEvents: Record<string, string[]>;
  onSelectDay: (date: string) => void;
  isLoading: boolean;
}) {
  // Build month grid
  const cells = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const totalDays = lastDay.getDate();
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const grid: { day: number; currentMonth: boolean; date: string }[] = [];

    // Prev month overflow
    const prevMonthLast = new Date(year, month - 1, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevMonthLast - i;
      const m = month - 1 < 1 ? 12 : month - 1;
      const y = month - 1 < 1 ? year - 1 : year;
      grid.push({ day: d, currentMonth: false, date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
    }

    for (let d = 1; d <= totalDays; d++) {
      grid.push({ day: d, currentMonth: true, date: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
    }

    const remaining = 42 - grid.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month + 1 > 12 ? 1 : month + 1;
      const y = month + 1 > 12 ? year + 1 : year;
      grid.push({ day: d, currentMonth: false, date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
    }

    return grid;
  }, [year, month]);

  const today = todayStr();

  if (isLoading) {
    return <Skeleton width="100%" height={380} borderRadius={8} />;
  }

  return (
    <div className="pt-sub">
      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {DAY_LABELS.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--g400)", padding: 6 }}>{d}</div>
        ))}
      </div>
      <div className="pt-cal-monthly">
        {cells.map((cell, i) => {
          const dayEvents = monthEvents[cell.date] ?? [];
          const isToday = cell.date === today;
          return (
            <div
              key={i}
              className={`pt-cal-month-cell ${!cell.currentMonth ? "inactive" : ""} ${isToday ? "today" : ""}`}
              onClick={() => cell.currentMonth && onSelectDay(cell.date)}
            >
              <span className="pt-cal-month-cell-num">{cell.day}</span>
              {dayEvents.length > 0 && (
                <div className="pt-cal-month-cell-dots">
                  {dayEvents.slice(0, 4).map((e, ei) => (
                    <div key={ei} style={{ width: 4, height: 4, borderRadius: 2, background: e === "high" ? "var(--red)" : e === "medium" ? "var(--amber)" : "var(--green)" }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 16 }}>
        {[{ c: "var(--red)", l: "High Impact" }, { c: "var(--amber)", l: "Medium" }, { c: "var(--green)", l: "Low" }].map((x) => (
          <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--g500)" }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: x.c }} />{x.l}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Alerts View                                                          */
/* ================================================================== */

function AlertsView({ supabase }: { supabase: ReturnType<typeof createBrowserClient> }) {
  const { data: alerts, isLoading } = useEventAlerts(supabase);
  const [alertToggles, setAlertToggles] = useState<Record<string, boolean>>({});
  const [prefs, setPrefs] = useState({ push: true, email: false, analytics: true, privacy: false });
  const [timing, setTiming] = useState(1);

  if (isLoading) {
    return (
      <div className="pt-g2">
        <Skeleton width="100%" height={300} borderRadius={8} />
        <Skeleton width="100%" height={200} borderRadius={8} />
      </div>
    );
  }

  const alertList = alerts ?? [];

  return (
    <div className="pt-g2">
      <div className="pt-sub">
        <p className="pt-sub-label">My Event Alerts</p>
        <div style={{ marginBottom: 16, padding: 16, background: "var(--lime-10)", border: "1px solid var(--lime)", borderRadius: "var(--r-md)", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
          <IconBell size={16} /> You&apos;ll be notified <strong>15 minutes</strong> before each event. Adjust timing in settings.
        </div>
        {alertList.map((a) => (
          <div className="pt-cal-alert-card" key={a.eventId}>
            <span style={{ fontSize: 20 }}>{FLAGS[a.country]}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                {a.name} <Badge variant="red">High</Badge>
              </div>
              <div style={{ fontSize: 12, color: "var(--g400)", display: "flex", gap: 12, marginTop: 2 }}>
                <span>{a.currency}</span>
                <span>Next: {a.nextDate}</span>
                <span>{a.frequency}</span>
              </div>
            </div>
            <Toggle
              checked={alertToggles[a.eventId] ?? a.enabled}
              onChange={() => setAlertToggles((p) => ({ ...p, [a.eventId]: !(p[a.eventId] ?? a.enabled) }))}
            />
          </div>
        ))}
      </div>

      <div>
        <div className="pt-sub">
          <p className="pt-sub-label">Alert Preferences</p>
          <div style={{ border: "var(--brd)", borderRadius: "var(--r-lg)", background: "var(--white)", padding: 20 }}>
            {[
              { title: "Push Notification", sub: "Get notified on your device", k: "push" as const },
              { title: "Email Alert", sub: "Receive email before events", k: "email" as const },
              { title: "In-App Banner", sub: "Show banner in feed", k: "analytics" as const },
              { title: "High Impact Only", sub: "Only alert for high-impact events", k: "privacy" as const },
            ].map((r) => (
              <div className="pt-settings-row" key={r.k}>
                <div className="pt-settings-row-info">
                  <div className="pt-settings-row-title">{r.title}</div>
                  <div className="pt-settings-row-sub">{r.sub}</div>
                </div>
                <Toggle checked={prefs[r.k]} onChange={() => setPrefs((p) => ({ ...p, [r.k]: !p[r.k] }))} />
              </div>
            ))}
          </div>
        </div>

        <div className="pt-sub">
          <p className="pt-sub-label">Timing</p>
          <div style={{ border: "var(--brd)", borderRadius: "var(--r-lg)", background: "var(--white)", padding: 20 }}>
            <div className="pt-review-form-label">Notify me before event</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["5 min", "15 min", "30 min", "1 hour", "1 day"].map((t, i) => (
                <button key={t} className={`pt-filter-chip ${timing === i ? "active" : ""}`} onClick={() => setTiming(i)}>{t}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Main Page                                                            */
/* ================================================================== */

export default function CalendarPage() {
  const [supabase] = useState(() => createBrowserClient());
  const now = new Date();
  const [calView, setCalView] = useState<CalView>("timeline");
  const [calImpact, setCalImpact] = useState("all");
  const [calCountry, setCalCountry] = useState("all");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [expandedEvent, setExpandedEvent] = useState(-1);
  const [calAlerts, setCalAlerts] = useState<Record<number, boolean>>({});

  // Hooks
  const { data: weekDays, isLoading: weekLoading } = useWeekDays(supabase, selectedDate);
  const { data: dayEvents, isLoading: eventsLoading } = useEconomicEvents(supabase, selectedDate);
  const { data: monthEvents, isLoading: monthLoading } = useMonthlyEvents(supabase, year, month);
  const toggleAlert = useToggleEventAlert(supabase);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (!dayEvents) return [];
    return dayEvents.filter((e) => {
      if (calImpact !== "all" && e.impact !== calImpact) return false;
      if (calCountry !== "all" && e.country !== calCountry) return false;
      return true;
    });
  }, [dayEvents, calImpact, calCountry]);

  // Date label
  const dateLabel = useMemo(() => {
    const d = new Date(selectedDate + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }, [selectedDate]);

  // Month nav
  const prevMonth = useCallback(() => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  }, [month, year]);

  const nextMonth = useCallback(() => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  }, [month, year]);

  // Week nav
  const prevWeek = useCallback(() => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - 7);
    setSelectedDate(d.toISOString().split("T")[0]);
    setSelectedDay(d.getDate());
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
    setExpandedEvent(-1);
  }, [selectedDate]);

  const nextWeek = useCallback(() => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + 7);
    setSelectedDate(d.toISOString().split("T")[0]);
    setSelectedDay(d.getDate());
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
    setExpandedEvent(-1);
  }, [selectedDate]);

  const goToday = useCallback(() => {
    const today = todayStr();
    setSelectedDate(today);
    const d = new Date();
    setSelectedDay(d.getDate());
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
    setExpandedEvent(-1);
  }, []);

  return (
    <div className="pt-container">
      <p className="pt-section-label">Markets</p>
      <h2 className="pt-section-title">Economic Calendar</h2>

      {/* View Toggle + Filters */}
      <div className="pt-cal-header">
        <ViewToggle view={calView} setView={(v) => { setCalView(v); setExpandedEvent(-1); }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ImpactFilter value={calImpact} onChange={setCalImpact} />
          <CountryFilter value={calCountry} onChange={setCalCountry} />
        </div>
      </div>

      {/* ── TIMELINE VIEW ── */}
      {calView === "timeline" && (
        <>
          {/* Week strip */}
          <div className="pt-sub">
            <div className="pt-cal-date-nav" style={{ marginBottom: 16 }}>
              <button className="pt-cal-date-btn" onClick={prevWeek}>&lsaquo;</button>
              <div className="pt-cal-date-label">{MONTH_NAMES[month - 1]} {year}</div>
              <button className="pt-cal-date-btn" onClick={nextWeek}>&rsaquo;</button>
              <button className="pt-cal-date-btn" onClick={goToday} style={{ marginLeft: 8, width: "auto", padding: "0 14px", fontSize: 12 }}>Today</button>
            </div>
            <WeekStrip
              weekDays={weekDays ?? []}
              selectedDay={selectedDay}
              onSelectDay={(num, date) => { setSelectedDay(num); setSelectedDate(date); setExpandedEvent(-1); }}
              isLoading={weekLoading}
            />
          </div>

          {/* Events List + Sidebar */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>
            <div className="pt-sub">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <p className="pt-sub-label" style={{ margin: 0 }}>{dateLabel}</p>
                <span style={{ fontSize: 12, color: "var(--g400)" }}>{filteredEvents.length} events</span>
              </div>

              {eventsLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} width="100%" height={60} borderRadius={8} />
                  ))}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--g400)", fontSize: 14 }}>
                  No events match your filters for this day
                </div>
              ) : (
                filteredEvents.map((ev, i) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    index={i}
                    expanded={expandedEvent === i}
                    onToggle={() => setExpandedEvent(expandedEvent === i ? -1 : i)}
                    alertOn={calAlerts[i] ?? false}
                    onToggleAlert={() => setCalAlerts((p) => ({ ...p, [i]: !p[i] }))}
                  />
                ))
              )}
            </div>

            {/* Sidebar */}
            <div>
              <UpNextCard events={dayEvents ?? []} />
              <TodaySummary events={dayEvents ?? []} />
              <AffectedPairsSidebar events={dayEvents ?? []} />
            </div>
          </div>
        </>
      )}

      {/* ── MONTHLY VIEW ── */}
      {calView === "monthly" && (
        <>
          <div className="pt-sub">
            <div className="pt-cal-date-nav" style={{ marginBottom: 16 }}>
              <button className="pt-cal-date-btn" onClick={prevMonth}>&lsaquo;</button>
              <div className="pt-cal-date-label">{MONTH_NAMES[month - 1]} {year}</div>
              <button className="pt-cal-date-btn" onClick={nextMonth}>&rsaquo;</button>
            </div>
          </div>
          <MonthlyGrid
            year={year}
            month={month}
            monthEvents={monthEvents ?? {}}
            onSelectDay={(date) => {
              setSelectedDate(date);
              const d = new Date(date + "T12:00:00");
              setSelectedDay(d.getDate());
              setCalView("timeline");
            }}
            isLoading={monthLoading}
          />
        </>
      )}

      {/* ── ALERTS VIEW ── */}
      {calView === "alerts" && <AlertsView supabase={supabase} />}
    </div>
  );
}
