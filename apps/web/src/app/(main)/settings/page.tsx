"use client";

import { useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useSession,
  useCurrentProfile,
  useUpdateProfile,
  useUploadAvatar,
  useSignOut,
  usePreferences,
  useUpdatePreferences,
  useUserSubscription,
  useCustomerPortal,
  useCancelSubscription,
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
import { Avatar } from "@/components/ui/Avatar";

type SettingsSection = "account" | "subscription" | "notifications" | "privacy" | "danger";

const NAV_ITEMS: { label: string; value: SettingsSection }[] = [
  { label: "Account", value: "account" },
  { label: "Subscription", value: "subscription" },
  { label: "Notifications", value: "notifications" },
  { label: "Privacy", value: "privacy" },
  { label: "Danger Zone", value: "danger" },
];

/* ------------------------------------------------------------------ */
/*  Avatar Cropper (Canvas-based)                                      */
/* ------------------------------------------------------------------ */
function AvatarCropper({
  file,
  onCrop,
  onCancel,
}: {
  file: File;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [isCropping, setIsCropping] = useState(false);

  const CROP_SIZE = 280;

  const handleImgLoad = useCallback(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Center the image initially
      const s = Math.max(CROP_SIZE / img.width, CROP_SIZE / img.height);
      setScale(s);
      setOffset({
        x: (CROP_SIZE - img.width * s) / 2,
        y: (CROP_SIZE - img.height * s) / 2,
      });
      setImgLoaded(true);
    };
    img.src = url;
  }, [file]);

  // Load image on mount
  useState(() => {
    handleImgLoad();
  });

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;

    // Clear
    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    // Draw image
    ctx.drawImage(
      img,
      offset.x,
      offset.y,
      img.width * scale,
      img.height * scale,
    );

    ctx.restore();

    // Draw circle border
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.strokeStyle = "var(--lime, #a8ff39)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [offset, scale]);

  // Redraw on every offset/scale change
  useState(() => {
    if (imgLoaded) drawCanvas();
  });

  // Use RAF to batch draws
  const rafRef = useRef<number>(0);
  const scheduleRedraw = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(drawCanvas);
  }, [drawCanvas]);

  // Trigger redraw when state changes
  if (imgLoaded && canvasRef.current) {
    scheduleRedraw();
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      setOffset((prev) => {
        const img = imgRef.current;
        if (!img) return prev;
        const w = img.width * scale;
        const h = img.height * scale;
        return {
          x: Math.min(0, Math.max(-(w - CROP_SIZE), prev.x + dx)),
          y: Math.min(0, Math.max(-(h - CROP_SIZE), prev.y + dy)),
        };
      });
    },
    [scale],
  );

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const img = imgRef.current;
    if (!img) return;
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    // Minimum scale: shortest side fills crop area
    const minScale = Math.max(CROP_SIZE / img.width, CROP_SIZE / img.height);
    setScale((s) => {
      const next = Math.min(Math.max(s + delta, minScale), 5);
      // Re-clamp offset at new scale
      const w = img.width * next;
      const h = img.height * next;
      setOffset((prev) => ({
        x: Math.min(0, Math.max(-(w - CROP_SIZE), prev.x)),
        y: Math.min(0, Math.max(-(h - CROP_SIZE), prev.y)),
      }));
      return next;
    });
  }, []);

  const handleCrop = useCallback(async () => {
    setIsCropping(true);
    try {
      // Render final crop at 512x512
      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = 512;
      outputCanvas.height = 512;
      const ctx = outputCanvas.getContext("2d");
      if (!ctx || !imgRef.current) return;

      const img = imgRef.current;
      const cropScale = 512 / CROP_SIZE;

      ctx.beginPath();
      ctx.arc(256, 256, 256, 0, Math.PI * 2);
      ctx.clip();

      ctx.drawImage(
        img,
        offset.x * cropScale,
        offset.y * cropScale,
        img.width * scale * cropScale,
        img.height * scale * cropScale,
      );

      outputCanvas.toBlob(
        (blob) => {
          if (blob) onCrop(blob);
        },
        "image/jpeg",
        0.9,
      );
    } finally {
      setIsCropping(false);
    }
  }, [offset, scale, onCrop]);

  return (
    <div className="pt-avatar-cropper-overlay">
      <div className="pt-avatar-cropper">
        <h3 className="pt-avatar-cropper-title">Adjust your photo</h3>
        <p className="pt-avatar-cropper-subtitle">
          Drag to position, scroll to zoom
        </p>

        <div
          className="pt-avatar-cropper-canvas-wrap"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <canvas
            ref={canvasRef}
            width={CROP_SIZE}
            height={CROP_SIZE}
            style={{ cursor: "grab", borderRadius: "50%" }}
          />
        </div>

        <div className="pt-avatar-cropper-zoom">
          <button
            type="button"
            className="pt-avatar-cropper-zoom-btn"
            onClick={() => {
              const img = imgRef.current;
              const minScale = img ? Math.max(CROP_SIZE / img.width, CROP_SIZE / img.height) : 0.1;
              setScale((s) => {
                const next = Math.max(minScale, s - 0.1);
                if (img) {
                  const w = img.width * next;
                  const h = img.height * next;
                  setOffset((prev) => ({
                    x: Math.min(0, Math.max(-(w - CROP_SIZE), prev.x)),
                    y: Math.min(0, Math.max(-(h - CROP_SIZE), prev.y)),
                  }));
                }
                return next;
              });
            }}
          >
            −
          </button>
          <span className="pt-avatar-cropper-zoom-label">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            className="pt-avatar-cropper-zoom-btn"
            onClick={() => {
              setScale((s) => {
                const next = Math.min(5, s + 0.1);
                const img = imgRef.current;
                if (img) {
                  const w = img.width * next;
                  const h = img.height * next;
                  setOffset((prev) => ({
                    x: Math.min(0, Math.max(-(w - CROP_SIZE), prev.x)),
                    y: Math.min(0, Math.max(-(h - CROP_SIZE), prev.y)),
                  }));
                }
                return next;
              });
            }}
          >
            +
          </button>
        </div>

        <div className="pt-avatar-cropper-actions">
          <button
            type="button"
            className="pt-btn ghost"
            onClick={onCancel}
          >
            <span>Cancel</span>
          </button>
          <button
            type="button"
            className="pt-btn lime"
            onClick={handleCrop}
            disabled={isCropping}
          >
            <span>{isCropping ? "Processing..." : "Use Photo"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const uploadAvatar = useUploadAvatar(supabase);
  const [saved, setSaved] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show profile avatar as preview if none pending
  const displayAvatar = avatarPreview ?? profile?.avatar_url ?? null;

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

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be under 10MB.");
      return;
    }

    setCropFile(file);
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleCropComplete = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setAvatarPreview(url);
    setPendingBlob(blob);
    setCropFile(null);
  }, []);

  const handleRemoveAvatar = useCallback(() => {
    setAvatarPreview(null);
    setPendingBlob(null);
  }, []);

  async function onSubmit(data: UpdateProfileInput) {
    setSaved(false);

    try {
      // Upload avatar if changed
      if (pendingBlob) {
        await uploadAvatar.mutateAsync({
          blob: pendingBlob,
          type: "image/jpeg",
        });
        setPendingBlob(null);
      }

      // Remove avatar if explicitly removed
      if (!displayAvatar && profile?.avatar_url) {
        data.avatar_url = null;
      }

      await updateProfile.mutateAsync(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err?.message || "Failed to save profile.");
    }
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
    <>
      {/* Avatar Cropper Modal */}
      {cropFile && (
        <AvatarCropper
          file={cropFile}
          onCrop={handleCropComplete}
          onCancel={() => setCropFile(null)}
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="pt-col" style={{ gap: 18 }}>
          {/* Avatar Upload Section */}
          <div className="pt-avatar-upload-section">
            <div
              className="pt-avatar-upload-preview"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Profile"
                  className="pt-avatar-upload-img"
                />
              ) : (
                <Avatar
                  src={null}
                  name={profile?.display_name ?? "?"}
                  size="xl"
                />
              )}
              <div className="pt-avatar-upload-overlay">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            <div className="pt-avatar-upload-actions">
              <button
                type="button"
                className="pt-avatar-upload-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Change Photo
              </button>
              {displayAvatar && (
                <button
                  type="button"
                  className="pt-avatar-upload-remove"
                  onClick={handleRemoveAvatar}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

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
              disabled={(!isDirty && !pendingBlob) || updateProfile.isPending || uploadAvatar.isPending}
            >
              {updateProfile.isPending || uploadAvatar.isPending
                ? "Saving..."
                : "Save Changes"}
            </Button>
            {saved && (
              <span style={{ color: "var(--lime)", fontSize: 14, fontWeight: 600 }}>
                Saved!
              </span>
            )}
          </div>
        </div>
      </form>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Subscription Section                                               */
/* ------------------------------------------------------------------ */
function SubscriptionSection() {
  const supabase = createBrowserClient();
  const { data: session } = useSession(supabase);
  const { data: profile } = useCurrentProfile(supabase, session?.user?.id);
  const { data: subscription, isLoading } = useUserSubscription(supabase);
  const customerPortal = useCustomerPortal();
  const cancelSub = useCancelSubscription(supabase);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="pt-col" style={{ gap: 16 }}>
        <Skeleton width="100%" height={44} borderRadius={10} />
        <Skeleton width="100%" height={120} borderRadius={10} />
      </div>
    );
  }

  const status = profile?.pro_subscription_status;
  const isActive = status === "active" || status === "trialing";
  const isCancelled = status === "canceled";
  const isPendingCancel = subscription?.cancel_at_period_end;

  // No subscription
  if (!subscription && !isActive) {
    return (
      <div>
        <h3 className="pt-settings-group-title">Pro Subscription</h3>
        <div
          style={{
            padding: 24,
            borderRadius: "var(--r-lg)",
            border: "1px solid var(--brd)",
            background: "var(--bg-2)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>
            <span style={{ background: "#c8ff00", color: "#0a0a0a", fontWeight: 800, fontSize: 14, padding: "4px 10px", borderRadius: 6, letterSpacing: 0.5 }}>PRO</span>
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
            You don&apos;t have an active subscription
          </p>
          <p style={{ fontSize: 13, color: "var(--g400)", marginBottom: 16 }}>
            Subscribe to Pro to unlock all courses, get verified, and access premium features.
          </p>
          <a
            href="/academy"
            className="pt-btn lime"
            style={{ display: "inline-flex", textDecoration: "none" }}
          >
            <span>Subscribe to Pro</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="pt-settings-group-title">Pro Subscription</h3>

      {/* Status card */}
      <div
        style={{
          padding: 20,
          borderRadius: "var(--r-lg)",
          border: `1px solid ${isActive ? "#c8ff00" : "var(--brd)"}`,
          background: "var(--bg-2)",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ background: "#c8ff00", color: "#0a0a0a", fontWeight: 800, fontSize: 12, padding: "3px 8px", borderRadius: 5, letterSpacing: 0.5 }}>PRO</span>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              {status === "trialing" ? "Trial" : isActive ? "Active" : isCancelled ? "Cancelled" : status === "past_due" ? "Past Due" : "Inactive"}
            </span>
          </div>
          {isActive && !isPendingCancel && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#0a0a0a",
                background: "#c8ff00",
                padding: "2px 8px",
                borderRadius: 20,
              }}
            >
              Active
            </span>
          )}
          {isPendingCancel && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--amber)",
                background: "rgba(245, 158, 11, 0.1)",
                padding: "2px 8px",
                borderRadius: 20,
              }}
            >
              Cancelling
            </span>
          )}
        </div>

        <div className="pt-settings-toggle-list" style={{ gap: 0 }}>
          <div className="pt-settings-toggle-row" style={{ borderBottom: "none" }}>
            <div>
              <div className="pt-settings-toggle-label">
                {isPendingCancel ? "Access until" : "Next billing date"}
              </div>
              <div className="pt-settings-toggle-desc">
                {isPendingCancel
                  ? `Your subscription will end on ${formatDate(subscription?.current_period_end ?? profile?.pro_expires_at)}`
                  : formatDate(subscription?.current_period_end ?? profile?.pro_expires_at)}
              </div>
            </div>
          </div>
        </div>

        {isPendingCancel && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: "var(--r-md)",
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              fontSize: 13,
              color: "var(--amber)",
              fontWeight: 500,
            }}
          >
            Your subscription has been cancelled but you&apos;ll retain access until the end of the current billing period.
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-col" style={{ gap: 10 }}>
        <Button
          variant="ghost"
          onClick={() => customerPortal.mutate()}
          disabled={customerPortal.isPending}
        >
          {customerPortal.isPending ? "Opening..." : "Manage Billing"}
        </Button>

        {isActive && !isPendingCancel && (
          <>
            {!confirmCancel ? (
              <Button
                variant="danger"
                onClick={() => setConfirmCancel(true)}
              >
                Cancel Subscription
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
                <p style={{ fontSize: 14, fontWeight: 600 }}>
                  Are you sure you want to cancel?
                </p>
                <p style={{ fontSize: 13, color: "var(--g400)" }}>
                  You&apos;ll keep access until{" "}
                  <strong>{formatDate(subscription?.current_period_end ?? profile?.pro_expires_at)}</strong>.
                  After that, you&apos;ll lose access to Pro courses and features.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    variant="danger"
                    disabled={cancelSub.isPending}
                    onClick={() => {
                      cancelSub.mutate(undefined, {
                        onSuccess: () => setConfirmCancel(false),
                      });
                    }}
                  >
                    {cancelSub.isPending ? "Cancelling..." : "Yes, Cancel"}
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
                    Keep Subscription
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {isCancelled && (
          <a
            href="/academy"
            className="pt-btn lime"
            style={{ display: "inline-flex", textDecoration: "none", width: "fit-content" }}
          >
            <span>Resubscribe to Pro</span>
          </a>
        )}
      </div>
    </div>
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
          {section === "subscription" && <SubscriptionSection />}
          {section === "notifications" && <NotificationsSection />}
          {section === "privacy" && <PrivacySection />}
          {section === "danger" && <DangerZoneSection />}
        </div>
      </div>
    </div>
  );
}
