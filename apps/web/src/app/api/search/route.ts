import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, MESSAGES_INDEX } from "@/lib/meilisearch";

/**
 * GET /api/search?q=query&community_id=xxx&room_id=xxx&limit=20&offset=0
 *
 * Search chat messages via Meilisearch.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? "";
  const communityId = searchParams.get("community_id");
  const roomId = searchParams.get("room_id");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  if (!q.trim()) {
    return NextResponse.json({ hits: [], estimatedTotalHits: 0 });
  }

  try {
    const client = createAdminClient();
    const index = client.index(MESSAGES_INDEX);

    // Build filter
    const filters: string[] = [];
    if (communityId) filters.push(`community_id = "${communityId}"`);
    if (roomId) filters.push(`room_id = "${roomId}"`);

    const results = await index.search(q, {
      filter: filters.length > 0 ? filters.join(" AND ") : undefined,
      limit,
      offset,
      sort: ["created_at:desc"],
      attributesToHighlight: ["content_text"],
      highlightPreTag: "<mark>",
      highlightPostTag: "</mark>",
      attributesToCrop: ["content_text"],
      cropLength: 80,
    });

    return NextResponse.json({
      hits: results.hits,
      estimatedTotalHits: results.estimatedTotalHits ?? 0,
      processingTimeMs: results.processingTimeMs,
    });
  } catch (err) {
    console.error("[search] Meilisearch error:", err);
    return NextResponse.json(
      { error: "Search unavailable", hits: [], estimatedTotalHits: 0 },
      { status: 503 }
    );
  }
}
