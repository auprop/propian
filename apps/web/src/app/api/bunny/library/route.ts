import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
  void req; // consumed for cookie context
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return null;
  return user;
}

/**
 * GET /api/bunny/library
 * List all videos from the Bunny Stream library.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminUser(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { apiKey, libraryId } = getBunnyConfig();

    const page = req.nextUrl.searchParams.get("page") || "1";
    const search = req.nextUrl.searchParams.get("search") || "";

    let url = `${BUNNY_API}/library/${libraryId}/videos?page=${page}&itemsPerPage=100&orderBy=date`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    const res = await fetch(url, {
      headers: { AccessKey: apiKey },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[bunny/library] List videos failed:", res.status, errText);
      return NextResponse.json(
        { error: `Bunny API error: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const items = data.items || data;

    const videos = (Array.isArray(items) ? items : []).map(
      (v: Record<string, unknown>) => ({
        guid: v.guid as string,
        title: v.title as string,
        dateUploaded: v.dateUploaded as string,
        length: (v.length as number) ?? 0,
        status: (v.status as number) ?? 0,
        encodeProgress: (v.encodeProgress as number) ?? 0,
        width: (v.width as number) ?? 0,
        height: (v.height as number) ?? 0,
        thumbnailUrl: v.thumbnailFileName
          ? `https://vz-${libraryId}.b-cdn.net/${v.guid}/${v.thumbnailFileName}`
          : null,
      })
    );

    return NextResponse.json({
      videos,
      totalItems: data.totalItems ?? videos.length,
      currentPage: data.currentPage ?? Number(page),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to list videos";
    console.error("[bunny/library] GET error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
