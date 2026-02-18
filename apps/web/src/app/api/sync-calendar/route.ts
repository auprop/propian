import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

/* ================================================================== */
/*  Types                                                               */
/* ================================================================== */

interface GeminiEvent {
  name: string;
  country: string;
  currency: string;
  time: string;
  impact: string;
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  description: string;
}

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const VALID_COUNTRIES = new Set([
  "us", "eu", "gb", "jp", "au", "ca", "ch", "nz", "cn",
]);

const COUNTRY_MAP: Record<string, string> = {
  us: "us", usa: "us", "united states": "us",
  eu: "eu", eur: "eu", eurozone: "eu", "euro zone": "eu", europe: "eu", germany: "eu", france: "eu", italy: "eu", spain: "eu",
  gb: "gb", uk: "gb", "united kingdom": "gb", britain: "gb", "great britain": "gb",
  jp: "jp", japan: "jp",
  au: "au", australia: "au",
  ca: "ca", canada: "ca",
  ch: "ch", switzerland: "ch", swiss: "ch",
  nz: "nz", "new zealand": "nz",
  cn: "cn", china: "cn",
};

const CURRENCY_MAP: Record<string, string> = {
  us: "USD", eu: "EUR", gb: "GBP", jp: "JPY",
  au: "AUD", ca: "CAD", ch: "CHF", nz: "NZD", cn: "CNY",
};

function normalizeCountry(raw: string): string | null {
  const lower = raw.toLowerCase().trim();
  if (VALID_COUNTRIES.has(lower)) return lower;
  return COUNTRY_MAP[lower] ?? null;
}

function normalizeImpact(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower === "high" || lower === "medium" || lower === "low") return lower;
  if (lower === "red" || lower === "critical") return "high";
  if (lower === "orange" || lower === "yellow" || lower === "moderate") return "medium";
  return "low";
}

function computeDirection(
  actual: string | null,
  forecast: string | null
): string | null {
  if (!actual || !forecast) return null;
  const a = parseFloat(actual.replace(/[^0-9.\-]/g, ""));
  const f = parseFloat(forecast.replace(/[^0-9.\-]/g, ""));
  if (isNaN(a) || isNaN(f)) return null;
  if (a > f) return "positive";
  if (a < f) return "negative";
  return "neutral";
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

/* ================================================================== */
/*  Analysis types & prompt                                             */
/* ================================================================== */

interface EventAnalysis {
  summary: string;
  marketImpact: string;
  tradingInsight: string;
  sentiment: "bullish" | "bearish" | "neutral";
}

interface AnalysisResult {
  name: string;
  country: string;
  summary: string;
  marketImpact: string;
  tradingInsight: string;
  sentiment: "bullish" | "bearish" | "neutral";
}

interface NotesResult {
  name: string;
  country: string;
  bullets: string[];
  keyTakeaway: string;
  affectedPairs: string[];
  priceAction: "bullish" | "bearish" | "neutral";
}

function buildAnalysisPrompt(
  events: { name: string; country: string; currency: string; actual: string; forecast: string | null; previous: string | null; impact: string }[]
): string {
  const eventList = events
    .map((e) => `- ${e.name} (${e.currency}): Actual=${e.actual}, Forecast=${e.forecast ?? "N/A"}, Previous=${e.previous ?? "N/A"}, Impact=${e.impact}`)
    .join("\n");

  return `You are a forex market analyst. For each of the following economic events that have just released their actual values, provide a brief market analysis.

Events:
${eventList}

For EACH event, return a JSON array of objects with these exact fields:
- "name": the event name (must match exactly)
- "country": the country code (must match exactly)
- "summary": one sentence comparing actual vs forecast/expectations (e.g. "Came in above expectations at 4.8% vs 4.6% forecast")
- "marketImpact": one sentence on how this affects the currency and broader market (e.g. "GBP likely to strengthen as higher wage growth supports BOE hawkish stance")
- "tradingInsight": one actionable trading insight (e.g. "Watch GBP/USD for long opportunities on pullbacks to 1.2650 support")
- "sentiment": "bullish", "bearish", or "neutral" for the related currency

Return ONLY valid JSON, no markdown, no code blocks.`;
}

/* ================================================================== */
/*  Notes prompt (detailed bullet-point breakdown)                      */
/* ================================================================== */

function buildNotesPrompt(
  events: { name: string; country: string; currency: string; actual: string; forecast: string | null; previous: string | null; impact: string }[]
): string {
  const eventList = events
    .map((e) => `- ${e.name} (${e.country.toUpperCase()}, ${e.currency}): Actual=${e.actual}, Forecast=${e.forecast ?? "N/A"}, Previous=${e.previous ?? "N/A"}, Impact=${e.impact}`)
    .join("\n");

  return `You are an expert forex market analyst providing detailed post-release analysis for prop traders.

These economic events have just released their actual values TODAY:

${eventList}

For EACH event, produce a detailed bullet-point breakdown. Return a JSON array of objects with these exact fields:
- "name": the event name (must match exactly)
- "country": the country code (must match exactly)
- "bullets": an array of 3-5 concise bullet-point strings, each describing:
  1. The actual result vs expectations (beat/miss/inline)
  2. Immediate market reaction (price moves in the first minutes)
  3. What it signals for monetary policy (rate hikes/cuts/holds)
  4. Broader economic implications
  5. Historical context if notable (highest since X, consecutive miss, etc.)
- "keyTakeaway": one sentence that summarizes the most important takeaway for traders
- "affectedPairs": array of 2-4 major forex pairs most impacted (e.g. ["GBP/USD", "EUR/GBP"])
- "priceAction": "bullish", "bearish", or "neutral" for the domestic currency

Keep each bullet under 120 characters. Be specific with numbers. Focus on actionable insights.

Return ONLY valid JSON, no markdown, no code blocks.`;
}

/* ================================================================== */
/*  Gemini prompts                                                      */
/* ================================================================== */

function buildPrompt(date: string): string {
  return `Search for all major economic calendar events scheduled for ${date}.

Focus on forex-relevant events from these countries: United States, Eurozone, United Kingdom, Japan, Australia, Canada, Switzerland, New Zealand, China.

For each event return a JSON array of objects with these exact fields:
- "name": the event name (e.g. "Non-Farm Payrolls", "CPI (YoY)", "ECB Rate Decision")
- "country": 2-letter country code (us, eu, gb, jp, au, ca, ch, nz, cn)
- "currency": the currency code (USD, EUR, GBP, JPY, AUD, CAD, CHF, NZD, CNY)
- "time": the event time in HH:mm UTC format (24h), or "TBA" if not scheduled
- "impact": importance level - "high", "medium", or "low"
- "forecast": the consensus forecast value as a string, or null if not available
- "previous": the previous period's value as a string, or null
- "actual": the actual released value as a string, or null if not yet released
- "description": one sentence describing what this indicator measures

If there are no events on this date (e.g. weekend or holiday), return an empty array [].

Return ONLY valid JSON, no markdown formatting, no code blocks, just the raw JSON array.`;
}

/**
 * Targeted prompt to look up actual released values for specific events.
 * Much more focused than the general sync prompt — lists exact event names
 * so Gemini can search for each one specifically.
 */
function buildActualValuesPrompt(
  events: { name: string; country: string; currency: string; event_time: string; forecast: string | null; previous: string | null }[],
  date: string
): string {
  const eventList = events
    .map((e) => `- "${e.name}" (${e.country.toUpperCase()}, ${e.currency}) scheduled at ${e.event_time} UTC — Forecast: ${e.forecast ?? "N/A"}, Previous: ${e.previous ?? "N/A"}`)
    .join("\n");

  return `Today is ${date}. The following economic events were scheduled for today and should have already been released. Search for their ACTUAL released values.

IMPORTANT: These events have ALREADY occurred. Look up the actual/released numbers from forex economic calendars, financial news sites, or official sources. Do NOT return null for actual if the event has been released.

Events to look up:
${eventList}

For EACH event, return a JSON array of objects with these exact fields:
- "name": the event name (must match EXACTLY as listed above)
- "country": the 2-letter country code (must match exactly)
- "actual": the actual released value as a string (e.g. "3.2%", "256K", "1.5%", "50.3"), or null ONLY if truly not yet released
- "forecast": the consensus forecast value as a string, or null
- "previous": the previous period's value as a string, or null

Return ONLY valid JSON, no markdown formatting, no code blocks, just the raw JSON array.`;
}

/* ================================================================== */
/*  JSON parsing helper                                                 */
/* ================================================================== */

function parseJsonResponse<T>(text: string): T[] {
  let jsonStr = text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  try {
    return JSON.parse(jsonStr);
  } catch {
    const match = jsonStr.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  }
}

/* ================================================================== */
/*  Route handler                                                       */
/* ================================================================== */

export async function POST(request: Request) {
  // Auth: validate CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase credentials not configured" },
      { status: 500 }
    );
  }

  // Init clients
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const today = new Date();
  const todayStr = formatDate(today);
  const currentMinute = today.getUTCMinutes();
  // Current UTC time as HH:mm:ss for comparing against event_time
  const nowTimeStr = today.toISOString().substring(11, 19);

  // ── Phase 0: Check today's released actual values ──────────────────
  // This runs EVERY invocation (every 10 min). It finds today's events
  // whose scheduled time has passed but still have no actual value,
  // then uses a targeted Gemini prompt to look up their released values.
  let actualsUpdated = 0;

  try {
    const { data: unreleased } = await supabase
      .from("economic_events")
      .select("id, source_id, name, country, currency, event_time, forecast, previous")
      .eq("event_date", todayStr)
      .is("actual", null)
      .lt("event_time", nowTimeStr) // Only events whose time has passed
      .order("event_time", { ascending: true });

    if (unreleased && unreleased.length > 0) {
      // Batch into chunks of 15 to avoid overly long prompts
      const chunks = [];
      for (let i = 0; i < unreleased.length; i += 15) {
        chunks.push(unreleased.slice(i, i + 15));
      }

      for (const chunk of chunks) {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: buildActualValuesPrompt(chunk, todayStr),
          config: {
            tools: [{ googleSearch: {} }],
            temperature: 0.1,
          },
        });

        const text = response.text ?? "";
        const results = parseJsonResponse<{
          name: string;
          country: string;
          actual: string | null;
          forecast: string | null;
          previous: string | null;
        }>(text);

        for (const r of results) {
          if (!r.actual) continue; // Still not released

          const matchingEvent = chunk.find(
            (e) => e.name === r.name && e.country === r.country
          );
          if (!matchingEvent) continue;

          const updateData: Record<string, unknown> = {
            actual: r.actual,
            actual_direction: computeDirection(r.actual, matchingEvent.forecast ?? r.forecast ?? null),
          };
          // Also update forecast/previous if we got better data
          if (r.forecast && !matchingEvent.forecast) {
            updateData.forecast = r.forecast;
          }
          if (r.previous && !matchingEvent.previous) {
            updateData.previous = r.previous;
          }

          const { error } = await supabase
            .from("economic_events")
            .update(updateData)
            .eq("id", matchingEvent.id);

          if (!error) actualsUpdated++;
        }
      }
    }
  } catch {
    // Phase 0 errors shouldn't block other phases
  }

  // ── Phase 1: Full 8-day event sync ─────────────────────────────────
  // Only runs when minute is 0-9 (i.e. once per hour) to save API calls.
  // The every-10-min invocations focus on today's actuals (Phase 0).
  const runFullSync = currentMinute < 10;
  let totalSynced = 0;
  const syncResults: { date: string; synced: number; error?: string }[] = [];

  if (runFullSync) {
    const dates: string[] = [];
    for (let i = 0; i < 8; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(formatDate(d));
    }

    for (const date of dates) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: buildPrompt(date),
          config: {
            tools: [{ googleSearch: {} }],
            temperature: 0.1,
          },
        });

        const text = response.text ?? "";
        const events = parseJsonResponse<GeminiEvent>(text);

        if (!Array.isArray(events) || events.length === 0) {
          syncResults.push({ date, synced: 0 });
          continue;
        }

        // Map to DB rows
        const rows = events
          .map((evt) => {
            const country = normalizeCountry(evt.country);
            if (!country) return null;

            const impact = normalizeImpact(evt.impact);
            const currency = evt.currency?.toUpperCase() || CURRENCY_MAP[country] || "USD";
            let time = evt.time === "TBA" || !evt.time ? "00:00" : evt.time;
            time = time.replace(/\s*UTC.*$/i, "").replace(/[^0-9:]/g, "").trim();
            const timeParts = time.match(/^(\d{1,2}):(\d{2})/);
            time = timeParts ? `${timeParts[1].padStart(2, "0")}:${timeParts[2]}` : "00:00";

            return {
              source_id: `gemini-${date}-${slugify(evt.name)}-${country}`,
              event_date: date,
              event_time: time + ":00",
              country,
              currency,
              name: evt.name,
              impact,
              actual: evt.actual || null,
              forecast: evt.forecast || null,
              previous: evt.previous || null,
              actual_direction: computeDirection(evt.actual, evt.forecast),
              description: evt.description || "",
              tags: [],
              source: "gemini",
            };
          })
          .filter(Boolean);

        if (rows.length > 0) {
          const { error } = await supabase
            .from("economic_events")
            .upsert(rows, { onConflict: "source_id" });

          if (error) {
            syncResults.push({ date, synced: 0, error: error.message });
            continue;
          }
        }

        syncResults.push({ date, synced: rows.length });
      } catch (err) {
        syncResults.push({
          date,
          synced: 0,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    totalSynced = syncResults.reduce((sum, r) => sum + r.synced, 0);
  }

  // ── Phase 2: Generate analysis for released events missing analysis ──
  let analysisGenerated = 0;

  try {
    const { data: needsAnalysis } = await supabase
      .from("economic_events")
      .select("id, source_id, name, country, currency, actual, forecast, previous, impact")
      .not("actual", "is", null)
      .is("analysis", null)
      .limit(20);

    if (needsAnalysis && needsAnalysis.length > 0) {
      const analysisResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buildAnalysisPrompt(needsAnalysis),
        config: {
          temperature: 0.3,
        },
      });

      const analyses = parseJsonResponse<AnalysisResult>(analysisResponse.text ?? "");

      for (const a of analyses) {
        const matchingEvent = needsAnalysis.find(
          (e) => e.name === a.name && e.country === a.country
        );
        if (!matchingEvent) continue;

        const analysis: EventAnalysis = {
          summary: a.summary,
          marketImpact: a.marketImpact,
          tradingInsight: a.tradingInsight,
          sentiment: a.sentiment,
        };

        const { error } = await supabase
          .from("economic_events")
          .update({ analysis })
          .eq("id", matchingEvent.id);

        if (!error) analysisGenerated++;
      }
    }
  } catch {
    // Analysis generation is non-critical
  }

  // ── Phase 3: Generate detailed bullet-point notes for today's releases ──
  let notesGenerated = 0;

  try {
    const { data: needsNotes } = await supabase
      .from("economic_events")
      .select("id, name, country, currency, actual, forecast, previous, impact")
      .eq("event_date", todayStr)
      .not("actual", "is", null)
      .is("notes", null)
      .limit(20);

    if (needsNotes && needsNotes.length > 0) {
      const notesResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buildNotesPrompt(needsNotes),
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.3,
        },
      });

      const notesList = parseJsonResponse<NotesResult>(notesResponse.text ?? "");

      for (const n of notesList) {
        const matchingEvent = needsNotes.find(
          (e) => e.name === n.name && e.country === n.country
        );
        if (!matchingEvent) continue;

        const notes = {
          bullets: n.bullets ?? [],
          keyTakeaway: n.keyTakeaway ?? "",
          affectedPairs: n.affectedPairs ?? [],
          priceAction: n.priceAction ?? "neutral",
          generatedAt: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("economic_events")
          .update({ notes })
          .eq("id", matchingEvent.id);

        if (!error) notesGenerated++;
      }
    }
  } catch {
    // Notes generation is non-critical
  }

  return NextResponse.json({
    success: true,
    actuals_updated: actualsUpdated,
    full_sync: runFullSync,
    total_synced: totalSynced,
    analysis_generated: analysisGenerated,
    notes_generated: notesGenerated,
    dates: runFullSync ? syncResults : [],
  });
}

// Also support GET for Vercel Cron (which sends GET requests)
export async function GET(request: Request) {
  return POST(request);
}
