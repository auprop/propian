import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import { MainShell } from "@/components/layout/MainShell";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  // 1) Try the lightweight cookie first (set by the client after first fetch).
  //    This avoids a DB query on every navigation.
  let cachedProfile: { avatar_url: string | null; display_name: string; username: string } | null = null;
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("propian-profile")?.value;
    if (raw) {
      cachedProfile = JSON.parse(decodeURIComponent(raw));
    }
  } catch {
    // Cookie missing or malformed — fall through to DB fetch
  }

  // 2) No cookie yet (first login, cleared cache, etc.) — fetch directly
  //    from Supabase so the very first server render already has real data.
  if (!cachedProfile) {
    try {
      const supabase = await createServerClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url, display_name, username")
          .eq("id", session.user.id)
          .single();
        if (profile) {
          cachedProfile = profile;
        }
      }
    } catch {
      // DB fetch failed — sidebar will use generic fallback
    }
  }

  return <MainShell cachedProfile={cachedProfile}>{children}</MainShell>;
}
