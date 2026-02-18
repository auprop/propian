export const firmCategories = [
  "All Firms",
  "Forex",
  "Futures",
  "Crypto",
  "High Rating",
  "Lowest Fee",
  "Best Payout",
] as const;

export type FirmCategory = (typeof firmCategories)[number];

export const reviewTags = [
  { id: "passed-challenge", label: "Passed Challenge", emoji: "✅" },
  { id: "failed-challenge", label: "Failed Challenge", emoji: "❌" },
  { id: "fast-payout", label: "Fast Payout", emoji: "⚡" },
  { id: "good-support", label: "Good Support", emoji: "💬" },
  { id: "bad-support", label: "Bad Support", emoji: "🚫" },
  { id: "fair-rules", label: "Fair Rules", emoji: "📋" },
  { id: "strict-rules", label: "Strict Rules", emoji: "⚠️" },
  { id: "recommend", label: "Would Recommend", emoji: "👍" },
] as const;

export const accountSizes = [
  "$10,000",
  "$25,000",
  "$50,000",
  "$100,000",
  "$200,000",
] as const;
