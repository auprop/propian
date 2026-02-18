import { useMemo, useState, useCallback } from "react";
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
import {
  useEconomicEvents,
  useWeekDays,
  useMonthlyEvents,
} from "@propian/shared/hooks";
import { getAffectedPairs } from "@propian/shared/api";
import type {
  EconomicEvent,
  EventImpact,
  CalendarWeekDay,
} from "@propian/shared/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { IconGlobe } from "@/components/icons/IconGlobe";
import { colors, fontFamily, radii } from "@/theme";
import { supabase } from "@/lib/supabase";

const SCREEN_WIDTH = Dimensions.get("window").width;

/* ─── Constants ─── */

const FLAGS: Record<string, string> = {
  all: "\uD83C\uDF0D", us: "\uD83C\uDDFA\uD83C\uDDF8", eu: "\uD83C\uDDEA\uD83C\uDDFA",
  gb: "\uD83C\uDDEC\uD83C\uDDE7", jp: "\uD83C\uDDEF\uD83C\uDDF5", au: "\uD83C\uDDE6\uD83C\uDDFA",
  ca: "\uD83C\uDDE8\uD83C\uDDE6", ch: "\uD83C\uDDE8\uD83C\uDDED", nz: "\uD83C\uDDF3\uD83C\uDDFF",
  cn: "\uD83C\uDDE8\uD83C\uDDF3",
};

const IMPACT_COLORS: Record<EventImpact, string> = {
  high: colors.red,
  medium: "#ffaa00",
  low: colors.green,
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
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

/* ─── View Toggle ─── */

type CalView = "timeline" | "monthly";

function ViewToggle({ view, setView }: { view: CalView; setView: (v: CalView) => void }) {
  return (
    <View style={s.viewToggle as ViewStyle}>
      {(["timeline", "monthly"] as CalView[]).map((v) => (
        <TouchableOpacity
          key={v}
          style={[
            s.viewToggleBtn as ViewStyle,
            view === v && { backgroundColor: colors.black },
          ]}
          onPress={() => setView(v)}
        >
          <Text style={[
            s.viewToggleText as TextStyle,
            view === v && { color: colors.lime },
          ]}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ─── Impact Filter ─── */

function ImpactFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { k: "all", l: "All" },
    { k: "high", l: "\uD83D\uDD34 High" },
    { k: "medium", l: "\uD83D\uDFE1 Med" },
    { k: "low", l: "\uD83D\uDFE2 Low" },
  ];
  return (
    <View style={s.filterRow as ViewStyle}>
      {options.map((f) => (
        <TouchableOpacity
          key={f.k}
          style={[
            s.filterChip as ViewStyle,
            value === f.k && { backgroundColor: colors.black },
          ]}
          onPress={() => onChange(f.k)}
        >
          <Text style={[
            s.filterChipText as TextStyle,
            value === f.k && { color: colors.lime },
          ]}>{f.l}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ─── Country Filter ─── */

function CountryFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { k: "all", l: "\uD83C\uDF0D" },
    { k: "us", l: "\uD83C\uDDFA\uD83C\uDDF8" },
    { k: "eu", l: "\uD83C\uDDEA\uD83C\uDDFA" },
    { k: "gb", l: "\uD83C\uDDEC\uD83C\uDDE7" },
    { k: "jp", l: "\uD83C\uDDEF\uD83C\uDDF5" },
    { k: "au", l: "\uD83C\uDDE6\uD83C\uDDFA" },
  ];
  return (
    <View style={s.filterRow as ViewStyle}>
      {options.map((f) => (
        <TouchableOpacity
          key={f.k}
          style={[
            s.filterChip as ViewStyle,
            value === f.k && { backgroundColor: colors.black },
            { paddingHorizontal: 8 },
          ]}
          onPress={() => onChange(f.k)}
        >
          <Text style={[
            s.filterChipText as TextStyle,
            { fontSize: 15 },
            value === f.k && { color: colors.lime },
          ]}>{f.l}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ─── Week Strip ─── */

function WeekStrip({
  weekDays,
  selectedDay,
  onSelectDay,
}: {
  weekDays: CalendarWeekDay[];
  selectedDay: number;
  onSelectDay: (num: number, date: string) => void;
}) {
  return (
    <View style={s.weekRow as ViewStyle}>
      {weekDays.map((d) => {
        const isActive = selectedDay === d.num;
        const isToday = d.today;
        return (
          <TouchableOpacity
            key={d.num}
            style={[
              s.weekDay as ViewStyle,
              isActive && { backgroundColor: colors.black, borderColor: colors.black },
              isToday && !isActive && { borderColor: colors.lime },
            ]}
            onPress={() => onSelectDay(d.num, d.date)}
          >
            <Text style={[s.weekDayName as TextStyle, isActive && { color: colors.g500 }]}>{d.day}</Text>
            <Text style={[s.weekDayNum as TextStyle, isActive && { color: colors.lime }]}>{d.num}</Text>
            <View style={s.weekDayDots as ViewStyle}>
              {d.events.slice(0, 3).map((e, i) => (
                <View key={i} style={[s.impactDot as ViewStyle, { backgroundColor: IMPACT_COLORS[e] }]} />
              ))}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ─── Event Card ─── */

function EventCard({
  event,
  expanded,
  onToggle,
}: {
  event: EconomicEvent;
  expanded: boolean;
  onToggle: () => void;
}) {
  const countdown = getCountdownText(event.date, event.time);
  const impactLevel = event.impact === "high" ? 3 : event.impact === "medium" ? 2 : 1;

  return (
    <TouchableOpacity style={s.eventCard as ViewStyle} onPress={onToggle} activeOpacity={0.7}>
      {/* Main row */}
      <View style={s.eventMain as ViewStyle}>
        {/* Time */}
        <Text style={s.eventTime as TextStyle}>{event.time}</Text>
        {/* Flag */}
        <Text style={{ fontSize: 16 }}>{FLAGS[event.country]}</Text>
        {/* Info */}
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={s.eventName as TextStyle} numberOfLines={1}>{event.name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={s.eventCurrency as TextStyle}>{event.currency}</Text>
            {countdown && (
              <View style={s.countdownBadge as ViewStyle}>
                <View style={s.countdownDot as ViewStyle} />
                <Text style={s.countdownText as TextStyle}>{countdown}</Text>
              </View>
            )}
          </View>
        </View>
        {/* Impact bars */}
        <View style={{ flexDirection: "row", gap: 2, marginRight: 8 }}>
          {[1, 2, 3].map((b) => (
            <View
              key={b}
              style={{
                width: 3, height: 10, borderRadius: 1.5,
                backgroundColor: b <= impactLevel ? IMPACT_COLORS[event.impact] : colors.g200,
              }}
            />
          ))}
        </View>
      </View>

      {/* Values row */}
      <View style={s.valuesRow as ViewStyle}>
        {[
          { label: "Actual", value: event.actual, dir: event.actualDirection },
          { label: "Forecast", value: event.forecast, dir: null },
          { label: "Previous", value: event.previous, dir: null },
        ].map((v) => (
          <View key={v.label} style={s.valueCol as ViewStyle}>
            <Text style={s.valueLabel as TextStyle}>{v.label}</Text>
            <Text style={[
              s.valueNum as TextStyle,
              v.dir === "positive" && { color: colors.green },
              v.dir === "negative" && { color: colors.red },
            ]}>{v.value ?? "\u2014"}</Text>
          </View>
        ))}
      </View>

      {/* Expanded detail */}
      {expanded && (
        <View style={s.eventDetail as ViewStyle}>
          <Text style={s.detailLabel as TextStyle}>Description</Text>
          <Text style={s.detailVal as TextStyle}>{event.description}</Text>

          {/* Analysis pending indicator */}
          {event.actual && !event.analysis && (
            <View style={{
              marginTop: 12,
              padding: 12,
              backgroundColor: "rgba(0,0,0,0.02)",
              borderRadius: 8,
              borderWidth: 1,
              borderStyle: "dashed" as never,
              borderColor: "#e5e5e5",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}>
              <Text style={{ fontSize: 14 }}>{"⏳"}</Text>
              <Text style={{ fontSize: 12, fontWeight: "500", color: "#888" }}>
                AI analysis is being generated and will appear shortly...
              </Text>
            </View>
          )}

          {/* Market Analysis (shown when actual is released) */}
          {event.analysis && (
            <View style={{
              marginTop: 12,
              padding: 14,
              backgroundColor: event.analysis.sentiment === "bullish" ? "rgba(34,197,94,0.06)"
                : event.analysis.sentiment === "bearish" ? "rgba(255,68,68,0.06)"
                : "rgba(0,0,0,0.03)",
              borderWidth: 1,
              borderColor: event.analysis.sentiment === "bullish" ? "rgba(34,197,94,0.2)"
                : event.analysis.sentiment === "bearish" ? "rgba(255,68,68,0.2)"
                : colors.g200,
              borderRadius: radii.md,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Text style={{ fontSize: 14 }}>
                  {event.analysis.sentiment === "bullish" ? "\uD83D\uDCC8" : event.analysis.sentiment === "bearish" ? "\uD83D\uDCC9" : "\u2796"}
                </Text>
                <Text style={{
                  fontSize: 11, fontFamily: fontFamily.sans.bold, textTransform: "uppercase", letterSpacing: 0.5,
                  color: event.analysis.sentiment === "bullish" ? colors.green : event.analysis.sentiment === "bearish" ? colors.red : colors.g500,
                }}>Market Analysis</Text>
                <View style={{
                  paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
                  backgroundColor: event.analysis.sentiment === "bullish" ? "rgba(34,197,94,0.12)"
                    : event.analysis.sentiment === "bearish" ? "rgba(255,68,68,0.12)"
                    : "rgba(0,0,0,0.06)",
                }}>
                  <Text style={{
                    fontSize: 9, fontFamily: fontFamily.sans.bold, textTransform: "capitalize",
                    color: event.analysis.sentiment === "bullish" ? colors.green : event.analysis.sentiment === "bearish" ? colors.red : colors.g500,
                  }}>{event.analysis.sentiment}</Text>
                </View>
              </View>

              <View style={{ gap: 10 }}>
                <View>
                  <Text style={{ fontSize: 9, fontFamily: fontFamily.sans.semibold, color: colors.g400, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Actual vs Forecast</Text>
                  <Text style={{ fontSize: 13, fontFamily: fontFamily.sans.medium, color: colors.black, lineHeight: 18 }}>{event.analysis.summary}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 9, fontFamily: fontFamily.sans.semibold, color: colors.g400, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Market Impact</Text>
                  <Text style={{ fontSize: 13, fontFamily: fontFamily.sans.medium, color: colors.black, lineHeight: 18 }}>{event.analysis.marketImpact}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 9, fontFamily: fontFamily.sans.semibold, color: colors.g400, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Trading Insight</Text>
                  <Text style={{ fontSize: 13, fontFamily: fontFamily.sans.medium, color: colors.black, lineHeight: 18 }}>{event.analysis.tradingInsight}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Detailed Post-Release Notes (bullet points) */}
          {event.notes && event.notes.bullets.length > 0 && (
            <View style={{
              marginTop: 12,
              padding: 14,
              backgroundColor: "rgba(0,0,0,0.02)",
              borderWidth: 2,
              borderColor: colors.black,
              borderRadius: radii.md,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Text style={{ fontSize: 14 }}>{"\uD83D\uDCCB"}</Text>
                <Text style={{
                  fontSize: 11, fontFamily: fontFamily.sans.bold, textTransform: "uppercase", letterSpacing: 0.5, color: colors.black,
                }}>Post-Release Summary</Text>
                <View style={{
                  paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
                  backgroundColor: event.notes.priceAction === "bullish" ? "rgba(34,197,94,0.12)"
                    : event.notes.priceAction === "bearish" ? "rgba(255,68,68,0.12)"
                    : "rgba(0,0,0,0.06)",
                }}>
                  <Text style={{
                    fontSize: 9, fontFamily: fontFamily.sans.bold, textTransform: "capitalize",
                    color: event.notes.priceAction === "bullish" ? colors.green : event.notes.priceAction === "bearish" ? colors.red : colors.g500,
                  }}>{event.notes.priceAction} {event.currency}</Text>
                </View>
              </View>
              <View style={{ gap: 6 }}>
                {event.notes.bullets.map((bullet: string, i: number) => (
                  <View key={i} style={{ flexDirection: "row", gap: 8, paddingLeft: 4 }}>
                    <Text style={{ fontSize: 13, color: colors.g400, lineHeight: 18 }}>{"\u2022"}</Text>
                    <Text style={{ fontSize: 13, fontFamily: fontFamily.sans.medium, color: colors.g700, lineHeight: 18, flex: 1 }}>{bullet}</Text>
                  </View>
                ))}
              </View>
              {event.notes.keyTakeaway ? (
                <View style={{
                  marginTop: 12,
                  padding: 10,
                  backgroundColor: event.notes.priceAction === "bullish" ? "rgba(34,197,94,0.08)"
                    : event.notes.priceAction === "bearish" ? "rgba(255,68,68,0.08)"
                    : "rgba(0,0,0,0.04)",
                  borderRadius: radii.sm,
                  borderLeftWidth: 3,
                  borderLeftColor: event.notes.priceAction === "bullish" ? colors.green : event.notes.priceAction === "bearish" ? colors.red : colors.g300,
                }}>
                  <Text style={{ fontSize: 9, fontFamily: fontFamily.sans.semibold, color: colors.g400, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Key Takeaway</Text>
                  <Text style={{ fontSize: 13, fontFamily: fontFamily.sans.semibold, color: colors.black, lineHeight: 18 }}>{event.notes.keyTakeaway}</Text>
                </View>
              ) : null}
              {event.notes.affectedPairs.length > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  <Text style={{ fontSize: 9, fontFamily: fontFamily.sans.semibold, color: colors.g400, textTransform: "uppercase", letterSpacing: 0.5 }}>Pairs:</Text>
                  {event.notes.affectedPairs.map((pair: string) => (
                    <View key={pair} style={{
                      paddingHorizontal: 8, paddingVertical: 2,
                      backgroundColor: colors.g100, borderRadius: radii.sm,
                      borderWidth: 1, borderColor: colors.g200,
                    }}>
                      <Text style={{ fontSize: 11, fontFamily: fontFamily.mono.regular, fontWeight: "600" }}>{pair}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={{ marginTop: 10 }}>
            <Text style={s.detailLabel as TextStyle}>Impact on {event.currency}</Text>
            <Text style={s.detailVal as TextStyle}>
              Typically {event.impact === "high" ? "50-100" : event.impact === "medium" ? "20-50" : "10-30"} pips
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

/* ─── Up Next Card ─── */

function UpNextCard({ events }: { events: EconomicEvent[] }) {
  const nextEvent = events.find((e) => getCountdownText(e.date, e.time) != null);
  if (!nextEvent) return null;

  const countdown = getCountdownText(nextEvent.date, nextEvent.time) ?? "";
  const parts = countdown.split(" ");

  return (
    <View style={s.upNextCard as ViewStyle}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Text style={{ fontSize: 20 }}>{FLAGS[nextEvent.country]}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fontFamily.sans.bold, fontSize: 14, color: colors.white }}>{nextEvent.name}</Text>
          <Text style={{ fontFamily: fontFamily.sans.regular, fontSize: 12, color: colors.g400 }}>
            {nextEvent.currency} · {nextEvent.impact.charAt(0).toUpperCase() + nextEvent.impact.slice(1)} Impact
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.g700, paddingTop: 12 }}>
        {parts.map((p, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 24, fontFamily: fontFamily.mono.regular, fontWeight: "800", color: colors.lime }}>{p.replace(/[hdm]/, "")}</Text>
            <Text style={{ fontSize: 9, color: colors.g500, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>
              {p.endsWith("h") ? "Hours" : p.endsWith("d") ? "Days" : "Min"}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ─── Summary Card ─── */

function SummaryCard({ events }: { events: EconomicEvent[] }) {
  const high = events.filter((e) => e.impact === "high").length;
  const med = events.filter((e) => e.impact === "medium").length;
  const low = events.filter((e) => e.impact === "low").length;
  const highRel = events.filter((e) => e.impact === "high" && e.actual != null).length;
  const medRel = events.filter((e) => e.impact === "medium" && e.actual != null).length;
  const lowRel = events.filter((e) => e.impact === "low" && e.actual != null).length;

  return (
    <View style={s.summaryCard as ViewStyle}>
      {[
        { label: "High Impact", count: high, released: highRel, color: colors.red },
        { label: "Medium Impact", count: med, released: medRel, color: "#ffaa00" },
        { label: "Low Impact", count: low, released: lowRel, color: colors.green },
      ].map((r) => (
        <View key={r.label} style={s.summaryRow as ViewStyle}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: r.color }} />
            <Text style={{ fontSize: 13, fontFamily: fontFamily.sans.medium, color: colors.black }}>{r.label}</Text>
          </View>
          <Text style={{ fontSize: 12, fontFamily: fontFamily.mono.regular, fontWeight: "600", color: colors.black }}>
            {r.released}/{r.count}
          </Text>
        </View>
      ))}
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 10, marginTop: 4 }}>
        <Text style={{ fontSize: 13, fontFamily: fontFamily.sans.semibold, color: colors.black }}>Total</Text>
        <Text style={{ fontSize: 13, fontFamily: fontFamily.mono.regular, fontWeight: "600", color: colors.black }}>{events.length}</Text>
      </View>
    </View>
  );
}

/* ─── Monthly Grid ─── */

const CELL_SIZE = Math.floor((SCREEN_WIDTH - 32 - 6 * 2) / 7);

function MonthlyGrid({
  year,
  month,
  monthEvents,
  onSelectDay,
}: {
  year: number;
  month: number;
  monthEvents: Record<string, string[]>;
  onSelectDay: (date: string) => void;
}) {
  const cells = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const totalDays = lastDay.getDate();
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const grid: { day: number; currentMonth: boolean; date: string }[] = [];
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
  const dayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <View style={s.gridWrap as ViewStyle}>
      {/* Day headers */}
      <View style={s.weekdayRow as ViewStyle}>
        {dayHeaders.map((name) => (
          <View key={name} style={s.weekdayCell as ViewStyle}>
            <Text style={s.weekdayText as TextStyle}>{name}</Text>
          </View>
        ))}
      </View>
      {/* Grid */}
      <View style={s.calGrid as ViewStyle}>
        {cells.map((cell, i) => {
          const dayEvents = monthEvents[cell.date] ?? [];
          const isToday = cell.date === today;
          return (
            <TouchableOpacity
              key={i}
              activeOpacity={cell.currentMonth ? 0.6 : 1}
              onPress={() => cell.currentMonth && onSelectDay(cell.date)}
              style={[
                s.monthCell as ViewStyle,
                !cell.currentMonth && { opacity: 0.25 },
                isToday && { borderColor: colors.lime },
              ]}
            >
              <Text style={[s.monthCellNum as TextStyle, isToday && { color: colors.lime }]}>{cell.day}</Text>
              {dayEvents.length > 0 && (
                <View style={s.monthCellDots as ViewStyle}>
                  {dayEvents.slice(0, 3).map((e, ei) => (
                    <View
                      key={ei}
                      style={{
                        width: 3, height: 3, borderRadius: 1.5,
                        backgroundColor: e === "high" ? colors.red : e === "medium" ? "#ffaa00" : colors.green,
                      }}
                    />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Legend */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 12 }}>
        {[{ c: colors.red, l: "High" }, { c: "#ffaa00", l: "Medium" }, { c: colors.green, l: "Low" }].map((x) => (
          <View key={x.l} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 2, backgroundColor: x.c }} />
            <Text style={{ fontSize: 11, fontFamily: fontFamily.sans.regular, color: colors.g400 }}>{x.l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ─── Main Screen ─── */

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [calView, setCalView] = useState<CalView>("timeline");
  const [calImpact, setCalImpact] = useState("all");
  const [calCountry, setCalCountry] = useState("all");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  // Hooks
  const { data: weekDays, isLoading: weekLoading, refetch, isRefetching } = useWeekDays(supabase, selectedDate);
  const { data: dayEvents, isLoading: eventsLoading } = useEconomicEvents(supabase, selectedDate);
  const { data: monthEvents, isLoading: monthLoading } = useMonthlyEvents(supabase, year, month);

  // Filter
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
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }, [selectedDate]);

  // Nav
  const prevWeek = useCallback(() => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - 7);
    setSelectedDate(d.toISOString().split("T")[0]);
    setSelectedDay(d.getDate());
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
    setExpandedEvent(null);
  }, [selectedDate]);

  const nextWeek = useCallback(() => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + 7);
    setSelectedDate(d.toISOString().split("T")[0]);
    setSelectedDay(d.getDate());
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
    setExpandedEvent(null);
  }, [selectedDate]);

  const prevMonth = useCallback(() => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  }, [month, year]);

  const nextMonth = useCallback(() => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  }, [month, year]);

  return (
    <View style={[s.container as ViewStyle, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header as ViewStyle}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <IconGlobe size={20} color={colors.lime} />
          <Text style={s.title as TextStyle}>Economic Calendar</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
      >
        {/* View toggle + filters */}
        <View style={{ paddingHorizontal: 16, gap: 14, marginBottom: 16, marginTop: 8 }}>
          <ViewToggle view={calView} setView={(v) => { setCalView(v); setExpandedEvent(null); }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            <ImpactFilter value={calImpact} onChange={setCalImpact} />
            <CountryFilter value={calCountry} onChange={setCalCountry} />
          </ScrollView>
        </View>

        {calView === "timeline" && (
          <>
            {/* Month label + week nav */}
            <View style={s.monthNav as ViewStyle}>
              <TouchableOpacity onPress={prevWeek} style={s.navBtn as ViewStyle}>
                <Text style={s.navBtnText as TextStyle}>{"\u2039"}</Text>
              </TouchableOpacity>
              <Text style={s.monthLabel as TextStyle}>
                {MONTH_NAMES[month - 1]} {year}
              </Text>
              <TouchableOpacity onPress={nextWeek} style={s.navBtn as ViewStyle}>
                <Text style={s.navBtnText as TextStyle}>{"\u203A"}</Text>
              </TouchableOpacity>
            </View>

            {/* Week strip */}
            {weekLoading ? (
              <View style={{ paddingHorizontal: 16 }}>
                <Skeleton width="100%" height={80} radius={8} />
              </View>
            ) : (
              <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                <WeekStrip
                  weekDays={weekDays ?? []}
                  selectedDay={selectedDay}
                  onSelectDay={(num, date) => { setSelectedDay(num); setSelectedDate(date); setExpandedEvent(null); }}
                />
              </View>
            )}

            {/* Day label + count */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 8 }}>
              <Text style={{ fontSize: 14, fontFamily: fontFamily.sans.bold, color: colors.black }}>{dateLabel}</Text>
              <Text style={{ fontSize: 12, fontFamily: fontFamily.sans.regular, color: colors.g400 }}>{filteredEvents.length} events</Text>
            </View>

            {/* Up Next card */}
            {dayEvents && dayEvents.length > 0 && (
              <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                <UpNextCard events={dayEvents} />
              </View>
            )}

            {/* Events */}
            <View style={{ paddingHorizontal: 16 }}>
              {eventsLoading ? (
                <View style={{ gap: 8 }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} width="100%" height={90} radius={8} />
                  ))}
                </View>
              ) : filteredEvents.length === 0 ? (
                <View style={[s.emptyCard as ViewStyle, { alignItems: "center", paddingVertical: 32 }]}>
                  <Text style={{ fontSize: 28, marginBottom: 8 }}>{"\uD83D\uDCC5"}</Text>
                  <Text style={{ fontSize: 14, fontFamily: fontFamily.sans.semibold, color: colors.black }}>No events</Text>
                  <Text style={{ fontSize: 13, fontFamily: fontFamily.sans.regular, color: colors.g400, textAlign: "center" }}>
                    No events match your filters for this day
                  </Text>
                </View>
              ) : (
                filteredEvents.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    expanded={expandedEvent === ev.id}
                    onToggle={() => setExpandedEvent(expandedEvent === ev.id ? null : ev.id)}
                  />
                ))
              )}
            </View>

            {/* Summary */}
            {dayEvents && dayEvents.length > 0 && (
              <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
                <Text style={{ fontSize: 12, fontFamily: fontFamily.sans.semibold, color: colors.g400, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Day Summary</Text>
                <SummaryCard events={dayEvents} />
              </View>
            )}

            {/* Affected pairs */}
            {dayEvents && dayEvents.length > 0 && (() => {
              const pairs = getAffectedPairs(dayEvents);
              if (pairs.length === 0) return null;
              return (
                <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
                  <Text style={{ fontSize: 12, fontFamily: fontFamily.sans.semibold, color: colors.g400, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Affected Pairs</Text>
                  <View style={s.summaryCard as ViewStyle}>
                    {pairs.map((p) => (
                      <View key={p.pair} style={s.summaryRow as ViewStyle}>
                        <Text style={{ fontFamily: fontFamily.mono.regular, fontSize: 13, fontWeight: "600", color: colors.black }}>{p.pair}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ fontSize: 11, fontFamily: fontFamily.sans.regular, color: colors.g400 }}>{p.events} events</Text>
                          <View style={[s.impactBadge as ViewStyle, { backgroundColor: p.impact === "high" ? "rgba(255,68,68,0.12)" : p.impact === "medium" ? "rgba(255,170,0,0.12)" : "rgba(34,197,94,0.12)" }]}>
                            <Text style={[s.impactBadgeText as TextStyle, { color: IMPACT_COLORS[p.impact] }]}>{p.impact}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}
          </>
        )}

        {calView === "monthly" && (
          <>
            <View style={s.monthNav as ViewStyle}>
              <TouchableOpacity onPress={prevMonth} style={s.navBtn as ViewStyle}>
                <Text style={s.navBtnText as TextStyle}>{"\u2039"}</Text>
              </TouchableOpacity>
              <Text style={s.monthLabel as TextStyle}>
                {MONTH_NAMES[month - 1]} {year}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={s.navBtn as ViewStyle}>
                <Text style={s.navBtnText as TextStyle}>{"\u203A"}</Text>
              </TouchableOpacity>
            </View>

            {monthLoading ? (
              <View style={{ padding: 16 }}>
                <Skeleton width="100%" height={300} radius={12} />
              </View>
            ) : (
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
              />
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: 18,
    fontFamily: fontFamily.sans.extrabold,
    color: colors.black,
    letterSpacing: -0.3,
  },
  scrollContent: { paddingBottom: 100 },

  /* View toggle */
  viewToggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  viewToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: colors.g100,
  },
  viewToggleText: {
    fontSize: 12,
    fontFamily: fontFamily.sans.semibold,
    color: colors.g500,
  },

  /* Filters */
  filterRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: 999,
    overflow: "hidden",
  },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: colors.white,
  },
  filterChipText: {
    fontSize: 11,
    fontFamily: fontFamily.sans.semibold,
    color: colors.g500,
  },

  /* Month nav */
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 14,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnText: {
    fontSize: 20,
    fontFamily: fontFamily.sans.semibold,
    color: colors.black,
  },
  monthLabel: {
    fontSize: 17,
    fontFamily: fontFamily.sans.bold,
    color: colors.black,
    minWidth: 160,
    textAlign: "center",
    letterSpacing: -0.3,
  },

  /* Week strip */
  weekRow: {
    flexDirection: "row",
    gap: 4,
  },
  weekDay: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radii.sm,
    alignItems: "center",
  },
  weekDayName: {
    fontSize: 9,
    fontFamily: fontFamily.sans.semibold,
    color: colors.g400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  weekDayNum: {
    fontSize: 17,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "700",
    color: colors.black,
  },
  weekDayDots: {
    flexDirection: "row",
    gap: 2,
    marginTop: 4,
    justifyContent: "center",
  },
  impactDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  /* Event card */
  eventCard: {
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    marginBottom: 8,
    overflow: "hidden",
  },
  eventMain: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  eventTime: {
    fontSize: 11,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "600",
    color: colors.g500,
    minWidth: 40,
  },
  eventName: {
    fontSize: 13,
    fontFamily: fontFamily.sans.semibold,
    color: colors.black,
    marginBottom: 1,
  },
  eventCurrency: {
    fontSize: 10,
    fontFamily: fontFamily.mono.regular,
    color: colors.g400,
  },
  valuesRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.g100,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  valueCol: {
    flex: 1,
    alignItems: "center",
  },
  valueLabel: {
    fontSize: 8,
    fontFamily: fontFamily.sans.semibold,
    color: colors.g400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  valueNum: {
    fontSize: 13,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "700",
    color: colors.black,
  },
  countdownBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.black,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countdownDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.lime,
  },
  countdownText: {
    fontSize: 10,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "600",
    color: colors.lime,
  },

  /* Event detail */
  eventDetail: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.g100,
    paddingTop: 10,
  },
  detailLabel: {
    fontSize: 9,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "600",
    color: colors.g400,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  detailVal: {
    fontSize: 13,
    fontFamily: fontFamily.sans.regular,
    color: colors.black,
    lineHeight: 18,
  },
  tag: {
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
    fontFamily: fontFamily.sans.semibold,
    color: colors.g500,
  },
  historyBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: 32,
    marginTop: 6,
  },

  /* Up next */
  upNextCard: {
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.md,
    backgroundColor: colors.black,
    padding: 16,
  },

  /* Summary */
  summaryCard: {
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    padding: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },

  /* Impact badge */
  impactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  impactBadgeText: {
    fontSize: 9,
    fontFamily: fontFamily.sans.bold,
    textTransform: "capitalize",
  },

  /* Empty */
  emptyCard: {
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    padding: 16,
  },

  /* Monthly grid */
  gridWrap: { paddingHorizontal: 16 },
  weekdayRow: {
    flexDirection: "row",
    gap: 2,
    marginBottom: 2,
  },
  weekdayCell: {
    width: CELL_SIZE,
    alignItems: "center",
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 9,
    fontFamily: fontFamily.sans.semibold,
    color: colors.g400,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  monthCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 3,
    backgroundColor: colors.white,
  },
  monthCellNum: {
    fontSize: 11,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "600",
    color: colors.black,
    marginBottom: 1,
  },
  monthCellDots: {
    flexDirection: "row",
    gap: 2,
    position: "absolute",
    bottom: 2,
  },
});
