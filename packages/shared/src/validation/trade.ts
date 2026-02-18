import { z } from "zod";

/**
 * Preprocessor: converts empty strings (from blank HTML number inputs) to
 * undefined so that `.optional()` lets them through instead of coercing "" → 0.
 */
const emptyToUndefined = (val: unknown) =>
  val === "" || val === undefined ? undefined : val;

/** Optional positive number — blank inputs are allowed, but filled values must be > 0 */
const optionalPositiveNumber = z.preprocess(
  emptyToUndefined,
  z.coerce.number().positive().optional().nullable(),
);

/** Optional number (no positivity constraint) — blank inputs allowed */
const optionalNumber = z.preprocess(
  emptyToUndefined,
  z.coerce.number().optional().nullable(),
);

export const logTradeSchema = z.object({
  pair: z.string().min(1, "Select a trading pair"),
  direction: z.enum(["long", "short"]),
  entry_price: z.preprocess(
    emptyToUndefined,
    z.coerce.number().positive("Entry price required"),
  ),
  exit_price: optionalPositiveNumber,
  lot_size: z.coerce.number().positive().default(0.01),
  stop_loss: optionalPositiveNumber,
  take_profit: optionalPositiveNumber,
  pnl: optionalNumber,
  pnl_pips: optionalNumber,
  rr_ratio: optionalNumber,
  commission: z.coerce.number().default(0),
  swap: z.coerce.number().default(0),
  screenshot_url: z.string().url().optional().nullable(),
  notes: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().max(2000).optional().nullable(),
  ),
  tags: z.array(z.string()).default([]),
  setup: z.string().optional().nullable(),
  mistakes: z.array(z.string()).default([]),
  emotion: z.enum(["confident", "neutral", "fearful", "greedy", "revenge"]).optional().nullable(),
  confidence: z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(1).max(5).optional().nullable(),
  ),
  status: z.enum(["open", "closed", "breakeven"]).default("closed"),
  trade_date: z.string().default(() => new Date().toISOString().split("T")[0]),
});

export type LogTradeInput = z.infer<typeof logTradeSchema>;
