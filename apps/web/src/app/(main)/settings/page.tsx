"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useSession,
  useCurrentProfile,
  useUpdateProfile,
  useSignOut,
  usePreferences,
  useUpdatePreferences,
} from "@propian/shared/hooks";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@propian/shared/validation";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";

type SettingsSection = "account" | "notifications" | "privacy" | "danger";

const NAV_ITEMS: { label: string; value: SettingsSection }[] = [
  { label: "Account", value: "account" },
  { label: "Notifications", value: "notifications" },
  { label: "Privacy", value: "privacy" },
  { label: "Danger Zone", value: "danger" },
];

/* ------------------------------------------------------------------ */
/*  Account Section                                                    */
/* ------------------------------------------------------------------ */
function AccountSection() {
  const supabase = createBrowserClient();
  const { data: session } = useSession(supabase);
  const { data: profile, isLoading } = useCurrentProfile(
    supabase,
    session?.user?.id
  );
  const updateProfile = useUpdateProfile(supabase);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    values: profile
      ? {
          display_name: profile.display_name,
          username: profile.username,
          bio: profile.bio ?? "",
          trading_style: profile.trading_style,
          experience_level: profile.experience_level,
        }
      : undefined,
  });

  async function onSubmit(data: UpdateProfileInput) {
    setSaved(false);
    await updateProfile.mutateAsync(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (isLoading) {
    return (
      <div className="pt-col" style={{ gap: 16 }}>
        <Skeleton width="100%" height={44} borderRadius={10} />
        <Skeleton width="100%" height={44} borderRadius={10} />
        <Skeleton width="100%" height={88} borderRadius={10} />
        <Skeleton width="100%" height={44} borderRadius={10} />
        <Skeleton width="100%" height={44} borderRadius={10} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="pt-col" style={{ gap: 18 }}>
        <Input
          label="Display Name"
          placeholder="Your name"
          error={errors.display_name?.message}
          {...register("display_name")}
        />
        <Input
          label="Username"
          placeholder="username"
          error={errors.username?.message}
          {...register("username")}
        />
        <Input
          label="Email"
          value={session?.user?.email ?? ""}
          disabled
          readOnly
        />
        <Textarea
          label="Bio"
          placeholder="Tell other traders about yourself..."
          rows={3}
          error={errors.bio?.message}
          {...register("bio")}
        />
        <div>
          <label className="pt-input-label">Trading Style</label>
          <select className="pt-input" {...register("trading_style")}>
            <option value="">Select...</option>
            <option value="scalper">Scalper</option>
            <option value="day-trader">Day Trader</option>
            <option value="swing">Swing Trader</option>
            <option value="position">Position Trader</option>
          </select>
          {errors.trading_style && (
            <p style={{ color: "var(--red)", fontSize: 13, marginTop: 4 }}>
              {errors.trading_style.message}
            </p>
          )}
        </div>
        <div>
          <label className="pt-input-label">Experience Level</label>
          <select className="pt-input" {...register("experience_level")}>
            <option value="">Select...</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          {errors.experience_level && (
            <p style={{ color: "var(--red)", fontSize: 13, marginTop: 4 }}>
              {errors.experience_level.message}
            </p>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button
            variant="primary"
            type="submit"
            disabled={!isDirty || updateProfile.isPending}
          >
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </Button>
          {saved && (
            <span style={{ color: "var(--lime)", fontSize: 14, fontWeight: 600 }}>
              Saved!
            </span>
          )}
        </div>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Notifications Section                                              */
/* ------------------------------------------------------------------ */
function NotificationsSection() {
  const supabase = createBrowserClient();
  const { data: prefs, isLoading } = usePreferences(supabase);
  const updatePrefs = useUpdatePreferences(supabase);

  function toggle(key: string) {
    if (!prefs) return;
    updatePrefs.mutate({ [key]: !(prefs as any)[key] });
  }

  if (isLoading || !prefs) {
    return (
      <div className="pt-col" style={{ gap: 16 }}>
        <Skeleton width="100%" height={44} borderRadius={10} />
        <Skeleton width="100%" height={44} borderRadius={10} />
        <Skeleton width="100%" height={44} borderRadius={10} />
      </div>
    );
  }

  return (
    <div className="pt-col" style={{ gap: 28 }}>
      {/* Email Notifications */}
      <div>
        <h3 className="pt-settings-group-title">Email Notifications</h3>
        <div className="pt-settings-toggle-list">
          <div className="pt-settings-toggle-row">
            <div>
              <div className="pt-settings-toggle-label">Mentions</div>
              <div className="pt-settings-toggle-desc">
                Someone mentions you in a post or comment
              </div>
            </div>
            <Toggle checked={prefs.email_mentions} onChange={() => toggle("email_mentions")} />
          </div>
          <div className="pt-settings-toggle-row">
            <div>
              <div className="pt-settings-toggle-label">New Followers</div>
              <div className="pt-settings-toggle-desc">
                Someone starts following your profile
              </div>
            </div>
            <Toggle checked={prefs.email_follows} onChange={() => toggle("email_follows")} />
          </div>
          <div className="pt-settings-toggle-row">
            <div>
              <div className="pt-settings-toggle-label">Reviews</div>
              <div className="pt-settings-toggle-desc">
                New reviews on firms you follow
              </div>
            </div>
            <Toggle checked={prefs.email_reviews} onChange={() => toggle("email_reviews")} />
          </div>
          <div className="pt-settings-toggle-row">
            <div>
              <div className="pt-settings-toggle-label">Marketing</div>
              <div className="pt-settings-toggle-desc">
                Product updates and announcements
              </div>
            </div>
            <Toggle checked={prefs.email_marketing} onChange={() => toggle("email_marketing")} />
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <div>
        <h3 className="pt-settings-group-title">Push Notifications</h3>
        <div className="pt-settings-toggle-list">
          <div className="pt-settings-toggle-row">
            <div>
              <div className="pt-settings-toggle-label">Mentions</div>
              <div className="pt-settings-toggle-desc">
                Get notified when someone mentions you
              </div>
            </div>
            <Toggle checked={prefs.push_mentions} onChange={() => toggle("push_mentions")} />
          </div>
          <div className="pt-settings-toggle-row">
            <div>
              <div className="pt-settings-toggle-label">Likes</div>
              <div className="pt-settings-toggle-desc">
                Someone likes your post or comment
              </div>
            </div>
            <Toggle checked={prefs.push_likes} onChange={() => toggle("push_likes")} />
          </div>
          <div className="pt-settings-toggle-row">
            <div>
              <div className="pt-settings-toggle-label">Follows</div>
              <div className="pt-settings-toggle-desc">
                New followers on your profile
              </div>
            </div>
            <Toggle checked={prefs.push_follows} onChange={() => toggle("push_follows")} />
          </div>
          <div className="pt-settings-toggle-row">
            <div>
              <div className="pt-settings-toggle-label">Comments</div>
              <div className="pt-settings-toggle-desc">
                Replies and comments on your posts
              </div>
            </div>
            <Toggle checked={prefs.push_comments} onChange={() => toggle("push_comments")} />
          </div>
          <div className="pt-settings-toggle-row">
            <div>
              <div className="pt-settings-toggle-label">Reviews</div>
              <div className="pt-settings-toggle-desc">
                New reviews on firms you reviewed
              </div>
            </div>
            <Toggle checked={prefs.push_reviews} onChange={() => toggle("push_reviews")} />
          </div>
        </div>
      </div>

      {/* In-App */}
      <div>
        <h3 className="pt-settings-group-title">In-App Notifications</h3>
        <div className="pt-settings-toggle-list">
          <div className="pt-settings-toggle-row">
            <div>
              <div className="pt-settings-toggle-label">All Notifications</div>
              <div className="pt-settings-toggle-desc">
                Show notification badge and bell indicator
              </div>
            </div>
            <Toggle checked={prefs.inapp_all} onChange={() => toggle("inapp_all")} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Privacy Section                                                    */
/* ------------------------------------------------------------------ */
function PrivacySection() {
  const supabase = createBrowserClient();
  const { data: prefs, isLoading } = usePreferences(supabase);
  const updatePrefs = useUpdatePreferences(supabase);

  function toggle(key: string) {
    if (!prefs) return;
    updatePrefs.mutate({ [key]: !(prefs as any)[key] });
  }

  if (isLoading || !prefs) {
    return (
      <div className="pt-col" style={{ gap: 16 }}>
        <Skeleton width="100%" height={44} borderRadius={10} />
        <Skeleton width="100%" height={44} borderRadius={10} />
        <Skeleton width="100%" height={44} borderRadius={10} />
      </div>
    );
  }

  return (
    <div>
      <h3 className="pt-settings-group-title">Privacy</h3>
      <div className="pt-settings-toggle-list">
        <div className="pt-settings-toggle-row">
          <div>
            <div className="pt-settings-toggle-label">Public Profile</div>
            <div className="pt-settings-toggle-desc">
              Allow anyone to view your profile and stats
            </div>
          </div>
          <Toggle checked={prefs.profile_visible} onChange={() => toggle("profile_visible")} />
        </div>
        <div className="pt-settings-toggle-row">
          <div>
            <div className="pt-settings-toggle-label">Activity Status</div>
            <div className="pt-settings-toggle-desc">
              Show when you are online to other users
            </div>
          </div>
          <Toggle checked={prefs.activity_status} onChange={() => toggle("activity_status")} />
        </div>
        <div className="pt-settings-toggle-row">
          <div>
            <div className="pt-settings-toggle-label">Search Visibility</div>
            <div className="pt-settings-toggle-desc">
              Allow your profile to appear in search results
            </div>
          </div>
          <Toggle checked={prefs.search_visible} onChange={() => toggle("search_visible")} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Danger Zone Section                                                */
/* ------------------------------------------------------------------ */
function DangerZoneSection() {
  const supabase = createBrowserClient();
  const signOut = useSignOut(supabase);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="pt-danger-zone">
      <h3 className="pt-settings-group-title" style={{ color: "var(--red)" }}>
        Danger Zone
      </h3>
      <p className="pt-settings-toggle-desc" style={{ marginBottom: 16 }}>
        These actions are permanent and cannot be undone.
      </p>
      <div className="pt-col" style={{ gap: 12 }}>
        <Button variant="ghost" onClick={() => signOut.mutate()}>
          Sign Out
        </Button>
        {!confirmDelete ? (
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete Account
          </Button>
        ) : (
          <div
            className="pt-col"
            style={{
              gap: 8,
              padding: 16,
              borderRadius: "var(--r-lg)",
              border: "1px solid var(--red)",
            }}
          >
            <p style={{ fontSize: 14, color: "var(--red)", fontWeight: 600 }}>
              Are you sure? This will permanently delete your account and all
              your data.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="danger" className="pt-btn danger">
                Yes, Delete My Account
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Settings Page                                                 */
/* ------------------------------------------------------------------ */
export default function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>("account");

  return (
    <div className="pt-container">
      <h1 className="pt-page-title">Settings</h1>

      <div className="pt-settings-layout">
        {/* Sidebar Navigation */}
        <nav className="pt-settings-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.value}
              className={`pt-settings-nav-item ${
                section === item.value ? "active" : ""
              } ${item.value === "danger" ? "danger" : ""}`}
              onClick={() => setSection(item.value)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="pt-settings-content">
          {section === "account" && <AccountSection />}
          {section === "notifications" && <NotificationsSection />}
          {section === "privacy" && <PrivacySection />}
          {section === "danger" && <DangerZoneSection />}
        </div>
      </div>
    </div>
  );
}
