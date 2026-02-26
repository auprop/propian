import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createHash } from "crypto";

const BUNNY_API = "https://video.bunnycdn.com";

function getBunnyConfig() {
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;

  if (!apiKey || !libraryId) {
    throw new Error("Missing BUNNY_STREAM_API_KEY or BUNNY_STREAM_LIBRARY_ID env vars");
  }

  return { apiKey, libraryId };
}

async function getAdminUser(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // read-only in route handlers
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Check admin status
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return null;

  return user;
}

/**
 * POST /api/bunny
 * Create a new video in Bunny Stream and return TUS upload credentials.
 * Body: { title: string }
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminUser(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { apiKey, libraryId } = getBunnyConfig();
    const { title } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    // Create video entry in Bunny Stream
    const createRes = await fetch(`${BUNNY_API}/library/${libraryId}/videos`, {
      method: "POST",
      headers: {
        AccessKey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("[bunny] Create video failed:", createRes.status, errText);
      return NextResponse.json(
        { error: `Bunny API error: ${createRes.status}` },
        { status: 502 }
      );
    }

    const video = await createRes.json();
    const videoId = video.guid as string;

    // Generate TUS authentication signature
    // SHA256(library_id + api_key + expiration_time + video_id)
    const expirationTime = Math.floor(Date.now() / 1000) + 86400; // 24h from now
    const hashInput = `${libraryId}${apiKey}${expirationTime}${videoId}`;
    const authSignature = createHash("sha256").update(hashInput).digest("hex");

    return NextResponse.json({
      videoId,
      libraryId: Number(libraryId),
      status: video.status ?? 0,
      tusEndpoint: `https://video.bunnycdn.com/tusupload`,
      authSignature,
      authExpire: expirationTime,
      embedUrl: `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create video";
    console.error("[bunny] POST error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/bunny?videoId=xxx
 * Check video encoding status from Bunny Stream.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminUser(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { apiKey, libraryId } = getBunnyConfig();
    const videoId = req.nextUrl.searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const res = await fetch(`${BUNNY_API}/library/${libraryId}/videos/${videoId}`, {
      headers: { AccessKey: apiKey },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Bunny API error: ${res.status}` },
        { status: 502 }
      );
    }

    const video = await res.json();

    return NextResponse.json({
      videoId: video.guid,
      status: video.status,
      encodeProgress: video.encodeProgress ?? 0,
      thumbnailUrl: video.thumbnailFileName
        ? `https://vz-${libraryId}.b-cdn.net/${video.guid}/${video.thumbnailFileName}`
        : null,
      length: video.length ?? 0,
      width: video.width ?? 0,
      height: video.height ?? 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to get video status";
    console.error("[bunny] GET error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/bunny?videoId=xxx
 * Remove a video from Bunny Stream.
 */
export async function DELETE(req: NextRequest) {
  try {
    const admin = await getAdminUser(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { apiKey, libraryId } = getBunnyConfig();
    const videoId = req.nextUrl.searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const res = await fetch(`${BUNNY_API}/library/${libraryId}/videos/${videoId}`, {
      method: "DELETE",
      headers: { AccessKey: apiKey },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Bunny API error: ${res.status}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete video";
    console.error("[bunny] DELETE error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
