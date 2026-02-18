"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { useSession, useCurrentProfile } from "@propian/shared/hooks";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const { data: session } = useSession(supabase);
  const { data: profile } = useCurrentProfile(supabase, session?.user?.id);

  useEffect(() => {
    if (profile?.username) {
      router.replace(`/profile/${profile.username}`);
    }
  }, [profile, router]);

  return (
    <div className="pt-container" style={{ textAlign: "center", paddingTop: 100 }}>
      <p style={{ color: "var(--g400)" }}>Loading profile...</p>
    </div>
  );
}
