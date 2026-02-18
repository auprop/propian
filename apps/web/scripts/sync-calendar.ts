#!/usr/bin/env npx tsx
/**
 * Standalone calendar sync script.
 *
 * Run locally with:
 *   npx tsx apps/web/scripts/sync-calendar.ts
 *
 * Or via npm script:
 *   pnpm --filter web sync-calendar
 *
 * Reads env vars from apps/web/.env.local automatically via dotenv.
 * Runs all 4 phases: actuals check → full sync → analysis → notes.
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local from the web app directory
config({ path: resolve(__dirname, "../.env.local") });

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
/*  Prompts                                                             */
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
/*  Main                                                                */
/* ================================================================== */

async function main() {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY not set in .env.local");
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env.local");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const today = new Date();
  const todayStr = formatDate(today);
  const nowTimeStr = today.toISOString().substring(11, 19);

  console.log(`\n🗓️  Calendar Sync — ${todayStr} (UTC: ${nowTimeStr})\n`);

  // ── Phase 1: Full 8-day event sync ─────────────────────────────────
  console.log("━━━ Phase 1: Full 8-day event sync ━━━");
  let totalSynced = 0;

  const dates: string[] = [];
  for (let i = 0; i < 8; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(formatDate(d));
  }

  for (const date of dates) {
    try {
      process.stdout.write(`  ${date} ... `);
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
        console.log("0 events");
        continue;
      }

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
          console.log(`❌ ${error.message}`);
          continue;
        }
      }

      const withActuals = rows.filter((r) => r && r.actual).length;
      console.log(`${rows.length} events synced${withActuals > 0 ? ` (${withActuals} with actuals)` : ""}`);
      totalSynced += rows.length;
    } catch (err) {
      console.log(`❌ ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  console.log(`  Total synced: ${totalSynced}\n`);

  // ── Phase 0: Check today's released actual values ──────────────────
  console.log("━━━ Phase 0: Check today's released actuals ━━━");
  let actualsUpdated = 0;

  try {
    const { data: unreleased } = await supabase
      .from("economic_events")
      .select("id, source_id, name, country, currency, event_time, forecast, previous")
      .eq("event_date", todayStr)
      .is("actual", null)
      .lt("event_time", nowTimeStr)
      .order("event_time", { ascending: true });

    if (!unreleased || unreleased.length === 0) {
      console.log("  No unreleased events to check (all have actuals or none have passed yet)\n");
    } else {
      console.log(`  Found ${unreleased.length} events past their time with no actual value`);

      const chunks = [];
      for (let i = 0; i < unreleased.length; i += 15) {
        chunks.push(unreleased.slice(i, i + 15));
      }

      for (const chunk of chunks) {
        console.log(`  Looking up actuals for ${chunk.length} events...`);
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
          if (!r.actual) continue;

          const matchingEvent = chunk.find(
            (e) => e.name === r.name && e.country === r.country
          );
          if (!matchingEvent) continue;

          const updateData: Record<string, unknown> = {
            actual: r.actual,
            actual_direction: computeDirection(r.actual, matchingEvent.forecast ?? r.forecast ?? null),
          };
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

          if (!error) {
            actualsUpdated++;
            console.log(`    ✅ ${r.name} (${r.country}) → actual: ${r.actual}`);
          }
        }
      }

      console.log(`  Updated ${actualsUpdated} actuals\n`);
    }
  } catch (err) {
    console.error(`  ❌ Phase 0 error: ${err instanceof Error ? err.message : "Unknown"}\n`);
  }

  // ── Phase 2: Generate analysis for released events ──────────────────
  console.log("━━━ Phase 2: Generate analysis ━━━");
  let analysisGenerated = 0;

  try {
    const { data: needsAnalysis } = await supabase
      .from("economic_events")
      .select("id, source_id, name, country, currency, actual, forecast, previous, impact")
      .not("actual", "is", null)
      .is("analysis", null)
      .limit(20);

    if (!needsAnalysis || needsAnalysis.length === 0) {
      console.log("  No events need analysis\n");
    } else {
      console.log(`  Generating analysis for ${needsAnalysis.length} events...`);

      const analysisResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buildAnalysisPrompt(needsAnalysis),
        config: { temperature: 0.3 },
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

        if (!error) {
          analysisGenerated++;
          console.log(`    ✅ ${a.name} (${a.country}) — ${a.sentiment}`);
        }
      }

      console.log(`  Generated ${analysisGenerated} analyses\n`);
    }
  } catch (err) {
    console.error(`  ❌ Phase 2 error: ${err instanceof Error ? err.message : "Unknown"}\n`);
  }

  // ── Phase 3: Generate detailed notes for today's releases ───────────
  console.log("━━━ Phase 3: Generate release notes ━━━");
  let notesGenerated = 0;

  try {
    const { data: needsNotes } = await supabase
      .from("economic_events")
      .select("id, name, country, currency, actual, forecast, previous, impact")
      .eq("event_date", todayStr)
      .not("actual", "is", null)
      .is("notes", null)
      .limit(20);

    if (!needsNotes || needsNotes.length === 0) {
      console.log("  No events need notes\n");
    } else {
      console.log(`  Generating notes for ${needsNotes.length} events...`);

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

        if (!error) {
          notesGenerated++;
          console.log(`    ✅ ${n.name} (${n.country}) — ${n.bullets.length} bullets`);
        }
      }

      console.log(`  Generated ${notesGenerated} note sets\n`);
    }
  } catch (err) {
    console.error(`  ❌ Phase 3 error: ${err instanceof Error ? err.message : "Unknown"}\n`);
  }

  // ── Summary ─────────────────────────────────────────────────────────
  console.log("━━━ Summary ━━━");
  console.log(`  Events synced:      ${totalSynced}`);
  console.log(`  Actuals updated:    ${actualsUpdated}`);
  console.log(`  Analyses generated: ${analysisGenerated}`);
  console.log(`  Notes generated:    ${notesGenerated}`);
  console.log(`\n✅ Done!\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
