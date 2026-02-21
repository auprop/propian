import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "../types";

/* ─── Avatar Upload ─── */

export async function uploadAvatar(
  supabase: SupabaseClient,
  file: { uri?: string; base64?: string; blob?: Blob; type?: string },
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const ext = file.type?.includes("png") ? "png" : file.type?.includes("webp") ? "webp" : "jpg";
  const filePath = `${user.id}/avatar.${ext}`;

  let uploadBody: Blob | ArrayBuffer;

  if (file.blob) {
    // Web: already a Blob
    uploadBody = file.blob;
  } else if (file.base64) {
    // Mobile: convert base64 to ArrayBuffer
    const binaryString = atob(file.base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    uploadBody = bytes.buffer;
  } else {
    throw new Error("No file data provided");
  }

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, uploadBody, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  // Add cache-busting timestamp so browsers/RN reload the new image
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  // Update the profile with the new avatar URL
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) throw updateError;

  return publicUrl;
}

export async function getProfile(supabase: SupabaseClient, username: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function getProfileById(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(
  supabase: SupabaseClient,
  updates: Partial<Pick<Profile, "display_name" | "username" | "bio" | "website" | "location" | "trading_style" | "experience_level" | "avatar_url">>
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function followUser(supabase: SupabaseClient, targetUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, following_id: targetUserId });
  if (error) throw error;
}

export async function unfollowUser(supabase: SupabaseClient, targetUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("follows")
    .delete()
    .match({ follower_id: user.id, following_id: targetUserId });
  if (error) throw error;
}

export async function getFollowStatus(supabase: SupabaseClient, targetUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "not_following" as const;
  if (user.id === targetUserId) return "self" as const;

  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .match({ follower_id: user.id, following_id: targetUserId })
    .maybeSingle();

  return data ? ("following" as const) : ("not_following" as const);
}
