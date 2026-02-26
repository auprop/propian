import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { createR2Client, uploadToR2 } from "@/lib/r2";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

export async function POST(req: NextRequest) {
  try {
    // Auth check
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const roomId = formData.get("roomId") as string | null;
    const context = formData.get("context") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!context && !roomId) {
      return NextResponse.json({ error: "roomId or context is required" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(arrayBuffer);
    let contentType = file.type;

    // Compress images with sharp
    const isImage = file.type.startsWith("image/") && file.type !== "image/gif";
    if (isImage) {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      const isThumbnail = context === "thumbnail";
      const maxWidth = isThumbnail ? 1280 : 1920;
      const quality = isThumbnail ? 85 : 80;

      if (metadata.width && metadata.width > maxWidth) {
        image.resize({ width: maxWidth, withoutEnlargement: true });
      }

      buffer = await image
        .jpeg({ quality })
        .toBuffer() as Buffer;
      contentType = "image/jpeg";
    }

    // Generate upload key based on context
    const ext = contentType.split("/")[1] || "bin";
    const key = context === "thumbnail"
      ? `thumbnails/${randomUUID()}.${ext}`
      : `chat/${roomId}/${randomUUID()}.${ext}`;

    // Upload to Cloudflare R2
    const r2 = createR2Client();
    const url = await uploadToR2(r2, key, buffer, contentType);

    return NextResponse.json({
      url,
      key,
      size: buffer.length,
      mimeType: contentType,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[upload] Error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
