import type { SupabaseClient } from "@supabase/supabase-js";

export async function signUp(
  supabase: SupabaseClient,
  data: { email: string; password: string; first_name: string; last_name: string; username: string }
) {
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        display_name: `${data.first_name} ${data.last_name}`,
        username: data.username,
      },
    },
  });
  if (error) throw error;
  return authData;
}

export async function signIn(supabase: SupabaseClient, email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithProvider(supabase: SupabaseClient, provider: "google" | "discord") {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback` },
  });
  if (error) throw error;
  return data;
}

export async function signOut(supabase: SupabaseClient) {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(supabase: SupabaseClient) {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

export async function resetPassword(supabase: SupabaseClient, email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/reset`,
  });
  if (error) throw error;
}

export async function verifyOtp(supabase: SupabaseClient, email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
  if (error) throw error;
  return data;
}

export async function resendVerification(supabase: SupabaseClient, email: string) {
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) throw error;
}
