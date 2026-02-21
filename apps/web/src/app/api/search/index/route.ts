import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  createAdminClient,
  ensureMessagesIndex,
  stripHtml,
  MESSAGES_INDEX,
  type IndexedMessage,
} from "@/lib/meilisearch";

/**
 * POST /api/search/index
 *
 * Index or re-index chat messages into Meilisearch.
 * Body: { community_id?: string, room_id?: string, full?: boolean }
 *
 * - full=true: re-index all messages for the community
 * - Otherwise: index recent messages (last 100)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Verify auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const communityId = body.community_id as string | undefined;
    const roomId = body.room_id as string | undefined;
    const full = body.full === true;

    // Ensure index exists with correct settings
    await ensureMessagesIndex();

    // Build query for messages
    let query = supabase
      .from("messages")
      .select(`
        id, room_id, user_id, content, type, created_at, ticker_mentions, is_pinned_to_library,
        author:profiles!user_id(display_name, avatar_url),
        room:chat_rooms!room_id(community_id, name)
      `)
      .eq("type", "text")
      .order("created_at", { ascending: false });

    if (roomId) {
      query = query.eq("room_id", roomId);
    } else if (communityId) {
      // Get all rooms for this community first
      const { data: rooms } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("community_id", communityId);

      if (rooms && rooms.length > 0) {
        query = query.in("room_id", rooms.map((r) => r.id));
      }
    }

    if (!full) {
      query = query.limit(100);
    } else {
      query = query.limit(5000); // Safety cap
    }

    const { data: messages, error } = await query;
    if (error) throw error;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ indexed: 0 });
    }

    // Transform to indexed format
    const documents: IndexedMessage[] = messages.map((msg: any) => ({
      id: msg.id,
      room_id: msg.room_id,
      community_id: msg.room?.community_id ?? null,
      channel_name: msg.room?.name ?? null,
      user_id: msg.user_id,
      author_name: msg.author?.display_name ?? "Unknown",
      author_avatar: msg.author?.avatar_url ?? null,
      content: msg.content,
      content_text: stripHtml(msg.content),
      type: msg.type,
      ticker_mentions: msg.ticker_mentions ?? [],
      is_pinned: msg.is_pinned_to_library ?? false,
      created_at: new Date(msg.created_at).getTime(),
    }));

    // Index into Meilisearch
    const client = createAdminClient();
    const index = client.index(MESSAGES_INDEX);
    const task = await index.addDocuments(documents);

    return NextResponse.json({
      indexed: documents.length,
      taskUid: task.taskUid,
    });
  } catch (err) {
    console.error("[search/index] Error:", err);
    return NextResponse.json(
      { error: "Indexing failed" },
      { status: 500 }
    );
  }
}
