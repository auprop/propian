/**
 * Economic Calendar API
 *
 * Queries economic events from Supabase (populated by Gemini sync route).
 * All functions take SupabaseClient as first param (matching trades, notifications pattern).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EconomicEvent,
  EventAnalysis,
  EventNotes,
  EventImpact,
  EventAlert,
  CalendarWeekDay,
} from "../types/calendar";

/* ================================================================== */
/*  Row → Type mapper                                                   */
/* ================================================================== */

interface EconomicEventRow {
  id: string;
  source_id: string;
  event_date: string;
  event_time: string;
  country: string;
  currency: string;
  name: string;
  impact: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  actual_direction: string | null;
  description: string | null;
  tags: string[];
  analysis: EventAnalysis | null;
  notes: EventNotes | null;
  source: string;
  created_at: string;
  updated_at: string;
}

function mapRowToEconomicEvent(row: EconomicEventRow): EconomicEvent {
  return {
    id: row.id,
    date: row.event_date,
    time: row.event_time?.substring(0, 5) ?? "00:00",
    country: row.country as EconomicEvent["country"],
    currency: row.currency,
    name: row.name,
    impact: row.impact as EventImpact,
    actual: row.actual,
    forecast: row.forecast,
    previous: row.previous,
    actualDirection: row.actual_direction as EconomicEvent["actualDirection"],
    description: row.description ?? "",
    tags: row.tags ?? [],
    history: [],
    analysis: row.analysis ?? null,
    notes: row.notes ?? null,
  };
}

/* ================================================================== */
/*  Event alert row mapper                                              */
/* ================================================================== */

interface EventAlertRow {
  id: string;
  user_id: string;
  event_name: string;
  country: string;
  currency: string;
  impact: string;
  enabled: boolean;
  notify_minutes_before: number;
  push_enabled: boolean;
  email_enabled: boolean;
  inapp_enabled: boolean;
  created_at: string;
  updated_at: string;
}

function mapRowToEventAlert(row: EventAlertRow): EventAlert {
  return {
    eventId: row.id,
    country: row.country as EventAlert["country"],
    currency: row.currency,
    name: row.event_name,
    impact: row.impact as EventImpact,
    nextDate: "",
    frequency: "",
    enabled: row.enabled,
  };
}

/* ================================================================== */
/*  Public API                                                          */
/* ================================================================== */

/**
 * Get economic events for a specific date
 */
export async function getEconomicEvents(
  supabase: SupabaseClient,
  date: string
): Promise<EconomicEvent[]> {
  const { data, error } = await supabase
    .from("economic_events")
    .select("*")
    .eq("event_date", date)
    .order("event_time", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapRowToEconomicEvent);
}

/**
 * Get economic events for a date range
 */
export async function getEconomicEventsRange(
  supabase: SupabaseClient,
  dateFrom: string,
  dateTo: string
): Promise<EconomicEvent[]> {
  const { data, error } = await supabase
    .from("economic_events")
    .select("*")
    .gte("event_date", dateFrom)
    .lte("event_date", dateTo)
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapRowToEconomicEvent);
}

/**
 * Get week data for the week containing the given date
 */
export async function getWeekDays(
  supabase: SupabaseClient,
  date: string
): Promise<CalendarWeekDay[]> {
  const d = new Date(date + "T12:00:00Z");
  const dow = d.getUTCDay();
  // Find Monday of this week
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - ((dow + 6) % 7));

  const todayStr = new Date().toISOString().split("T")[0];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Build date range for the week
  const weekStart = monday.toISOString().split("T")[0];
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const weekEnd = sunday.toISOString().split("T")[0];

  // Fetch only date + impact for the week
  const { data, error } = await supabase
    .from("economic_events")
    .select("event_date, impact")
    .gte("event_date", weekStart)
    .lte("event_date", weekEnd);

  if (error) throw error;

  // Group by date
  const byDate = new Map<string, EventImpact[]>();
  for (const row of data ?? []) {
    const existing = byDate.get(row.event_date) ?? [];
    existing.push(row.impact as EventImpact);
    byDate.set(row.event_date, existing);
  }

  // Build week days
  const days: CalendarWeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + i);
    const dateStr = day.toISOString().split("T")[0];

    days.push({
      day: dayNames[i],
      num: day.getUTCDate(),
      date: dateStr,
      events: byDate.get(dateStr) ?? [],
      today: dateStr === todayStr,
    });
  }

  return days;
}

/**
 * Get monthly event summary (for monthly calendar view)
 */
export async function getMonthlyEventSummary(
  supabase: SupabaseClient,
  year: number,
  month: number
): Promise<Map<string, EventImpact[]>> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("economic_events")
    .select("event_date, impact")
    .gte("event_date", startDate)
    .lte("event_date", endDate);

  if (error) throw error;

  const result = new Map<string, EventImpact[]>();
  for (const row of data ?? []) {
    const existing = result.get(row.event_date) ?? [];
    existing.push(row.impact as EventImpact);
    result.set(row.event_date, existing);
  }

  return result;
}

/**
 * Get user's event alerts
 */
export async function getEventAlerts(
  supabase: SupabaseClient
): Promise<EventAlert[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("event_alerts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRowToEventAlert);
}

/**
 * Toggle an event alert (create if not exists, delete if exists)
 */
export async function toggleEventAlert(
  supabase: SupabaseClient,
  params: {
    eventName: string;
    country: string;
    currency: string;
    impact: string;
  }
): Promise<{ action: "created" | "deleted" }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check if alert exists
  const { data: existing } = await supabase
    .from("event_alerts")
    .select("id")
    .eq("user_id", user.id)
    .eq("event_name", params.eventName)
    .eq("country", params.country)
    .maybeSingle();

  if (existing) {
    // Delete (toggle off)
    const { error } = await supabase
      .from("event_alerts")
      .delete()
      .eq("id", existing.id);
    if (error) throw error;
    return { action: "deleted" };
  } else {
    // Insert (toggle on)
    const { error } = await supabase.from("event_alerts").insert({
      user_id: user.id,
      event_name: params.eventName,
      country: params.country,
      currency: params.currency,
      impact: params.impact,
    });
    if (error) throw error;
    return { action: "created" };
  }
}

/**
 * Get affected currency pairs for a day's events (pure utility, no DB)
 */
export function getAffectedPairs(
  events: EconomicEvent[]
): { pair: string; events: number; impact: EventImpact }[] {
  const currencies = new Set(events.map((e) => e.currency));
  const pairs: { pair: string; events: number; impact: EventImpact }[] = [];

  const MAJORS = [
    "EUR/USD",
    "GBP/USD",
    "USD/JPY",
    "AUD/USD",
    "USD/CAD",
    "USD/CHF",
    "NZD/USD",
  ];

  for (const pair of MAJORS) {
    const [base, quote] = pair.split("/");
    if (currencies.has(base) || currencies.has(quote)) {
      const relevantEvents = events.filter(
        (e) => e.currency === base || e.currency === quote
      );
      const highestImpact = relevantEvents.some((e) => e.impact === "high")
        ? "high"
        : relevantEvents.some((e) => e.impact === "medium")
          ? "medium"
          : "low";
      pairs.push({
        pair,
        events: relevantEvents.length,
        impact: highestImpact as EventImpact,
      });
    }
  }

  return pairs.sort((a, b) => b.events - a.events);
}
