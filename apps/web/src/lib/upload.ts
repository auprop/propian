/**
 * Client-side upload utility — calls the /api/upload route.
 */
export async function uploadFile(
  file: File,
  context: { roomId: string; communityId?: string }
): Promise<{ url: string; key: string; size: number; mimeType: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("roomId", context.roomId);
  if (context.communityId) {
    formData.append("communityId", context.communityId);
  }

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Upload failed");
  }

  return res.json();
}
