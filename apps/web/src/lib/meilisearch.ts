import { MeiliSearch } from "meilisearch";

/* ─── Clients ─── */

/** Admin client for indexing (server-side only) */
export function createAdminClient() {
  return new MeiliSearch({
    host: process.env.MEILISEARCH_HOST!,
    apiKey: process.env.MEILISEARCH_ADMIN_KEY!,
  });
}

/** Search client (can be used client-side with search-only key) */
export function createSearchClient() {
  return new MeiliSearch({
    host: process.env.NEXT_PUBLIC_MEILISEARCH_HOST || process.env.MEILISEARCH_HOST!,
    apiKey: process.env.NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY || process.env.MEILISEARCH_SEARCH_KEY!,
  });
}

/* ─── Index Names ─── */

export const MESSAGES_INDEX = "chat_messages";

/* ─── Index Configuration ─── */

export interface IndexedMessage {
  id: string;
  room_id: string;
  community_id: string | null;
  channel_name: string | null;
  user_id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  /** Plain text content stripped of HTML for better search */
  content_text: string;
  type: "text" | "image";
  ticker_mentions: string[];
  is_pinned: boolean;
  created_at: number; // Unix timestamp for sorting/filtering
}

/** Ensure the messages index exists with correct settings */
export async function ensureMessagesIndex() {
  const client = createAdminClient();

  try {
    await client.getIndex(MESSAGES_INDEX);
  } catch {
    await client.createIndex(MESSAGES_INDEX, { primaryKey: "id" });
  }

  const index = client.index(MESSAGES_INDEX);

  // Configure searchable and filterable attributes
  await index.updateSettings({
    searchableAttributes: ["content_text", "author_name", "ticker_mentions"],
    filterableAttributes: ["community_id", "room_id", "type", "is_pinned", "created_at"],
    sortableAttributes: ["created_at"],
    displayedAttributes: [
      "id", "room_id", "community_id", "channel_name",
      "user_id", "author_name", "author_avatar",
      "content", "type", "is_pinned", "created_at",
    ],
  });

  return index;
}

/** Strip HTML tags to get plain text for indexing */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
