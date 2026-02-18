"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFirm, useFirmReviews, useCreateReview, useVoteReview, useSession } from "@propian/shared/hooks";
import { reviewSchema, type ReviewInput } from "@propian/shared/validation";
import { reviewTags } from "@propian/shared/constants";
import type { FirmReview } from "@propian/shared/types";
import { timeAgo } from "@propian/shared/utils";
import { IconVerified, IconThumbUp, IconPlus, IconClose, IconStar } from "@propian/shared/icons";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { RatingStars } from "@/components/ui/RatingStars";
import { Skeleton } from "@/components/ui/Skeleton";
import { Toggle } from "@/components/ui/Toggle";

type Tab = "overview" | "reviews" | "rules" | "analytics";

export default function FirmDetailPage() {
  const params = useParams<{ slug: string }>();
  const supabase = createBrowserClient();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [reviewSort, setReviewSort] = useState<"recent" | "helpful">("recent");
  const [showPreview, setShowPreview] = useState(false);

  const { data: session } = useSession(supabase);
  const { data: firm, isLoading: firmLoading } = useFirm(supabase, params.slug);
  const { data: reviews, isLoading: reviewsLoading } = useFirmReviews(
    supabase,
    firm?.id ?? "",
    reviewSort
  );
  const createReview = useCreateReview(supabase);
  const voteReview = useVoteReview(supabase);

  // Review form
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      title: "",
      body: "",
      pros: [""] as string[],
      cons: [""] as string[],
      tags: [] as string[],
      is_anonymous: false,
    },
  });

  const watchedPros = watch("pros") || [""];
  const watchedCons = watch("cons") || [""];
  const watchedRating = watch("rating");
  const watchedTags = watch("tags");

  const prosFields = watchedPros.map((v: string, i: number) => ({ id: String(i), value: v }));
  const consFields = watchedCons.map((v: string, i: number) => ({ id: String(i), value: v }));
  const appendPro = (val: string) => setValue("pros", [...watchedPros, val]);
  const removePro = (idx: number) => setValue("pros", watchedPros.filter((_: string, i: number) => i !== idx));
  const appendCon = (val: string) => setValue("cons", [...watchedCons, val]);
  const removeCon = (idx: number) => setValue("cons", watchedCons.filter((_: string, i: number) => i !== idx));
  const watchedAnonymous = watch("is_anonymous");

  function toggleTag(tagId: string) {
    const current = watchedTags || [];
    if (current.includes(tagId)) {
      setValue("tags", current.filter((t) => t !== tagId));
    } else {
      setValue("tags", [...current, tagId]);
    }
  }

  async function onSubmitReview(data: ReviewInput) {
    if (!firm) return;
    await createReview.mutateAsync({ firmId: firm.id, review: data });
    reset();
    setActiveTab("reviews");
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "reviews", label: "Reviews" },
    { key: "rules", label: "Rules" },
    { key: "analytics", label: "Analytics" },
  ];

  // Loading state
  if (firmLoading) {
    return (
      <div className="pt-container">
        <Skeleton width="100%" height={200} borderRadius={16} />
        <div style={{ marginTop: 16 }}>
          <Skeleton width="40%" height={28} />
          <Skeleton width="60%" height={16} />
        </div>
      </div>
    );
  }

  if (!firm) {
    return (
      <div className="pt-container">
        <div className="pt-empty">
          <h3 className="pt-empty-title">Firm not found</h3>
          <p className="pt-empty-desc">This firm does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  // Compute rating breakdown (simulated from review data)
  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews?.filter((r: FirmReview) => Math.round(r.rating) === star).length ?? 0;
    const total = reviews?.length ?? 1;
    return { star, count, percent: total > 0 ? (count / total) * 100 : 0 };
  });

  return (
    <div className="pt-container">
      {/* Hero Banner */}
      <div className="pt-firm-hero">
        <div className="pt-firm-logo" style={{ width: 72, height: 72, fontSize: 28 }}>
          {firm.logo_url ? (
            <img src={firm.logo_url} alt={firm.name} />
          ) : (
            <span>{firm.name.charAt(0)}</span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{firm.name}</h1>
            {firm.is_active && <IconVerified size={20} style={{ color: "var(--lime)" }} />}
          </div>
          <div className="pt-firm-rating" style={{ marginTop: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 18 }}>{firm.rating_avg.toFixed(1)}</span>
            <RatingStars rating={firm.rating_avg} size={16} />
            <span style={{ opacity: 0.6 }}>({firm.review_count} reviews)</span>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {firm.rating_avg >= 4 && <Badge variant="lime">Top Rated</Badge>}
            {firm.platforms.map((p) => (
              <Badge key={p}>{p}</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="pt-firm-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`pt-firm-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* === Overview Tab === */}
      {activeTab === "overview" && (
        <div>
          {/* Description */}
          {firm.description && (
            <p style={{ lineHeight: 1.7, opacity: 0.85, marginBottom: 24 }}>{firm.description}</p>
          )}

          {/* Key Stats */}
          <div className="pt-firm-stats" style={{ marginBottom: 24 }}>
            {firm.profit_split && (
              <div className="pt-firm-stat">
                <span style={{ opacity: 0.5, fontSize: 11 }}>Profit Split</span>
                <span style={{ fontWeight: 700, fontSize: 18 }}>{firm.profit_split}</span>
              </div>
            )}
            {firm.max_drawdown && (
              <div className="pt-firm-stat">
                <span style={{ opacity: 0.5, fontSize: 11 }}>Max Drawdown</span>
                <span style={{ fontWeight: 700, fontSize: 18 }}>{firm.max_drawdown}</span>
              </div>
            )}
            {firm.challenge_fee_min !== null && (
              <div className="pt-firm-stat">
                <span style={{ opacity: 0.5, fontSize: 11 }}>Starting Fee</span>
                <span style={{ fontWeight: 700, fontSize: 18 }}>${firm.challenge_fee_min}</span>
              </div>
            )}
            {firm.pass_rate && (
              <div className="pt-firm-stat">
                <span style={{ opacity: 0.5, fontSize: 11 }}>Pass Rate</span>
                <span style={{ fontWeight: 700, fontSize: 18 }}>{firm.pass_rate}</span>
              </div>
            )}
          </div>

          {/* Rating Breakdown */}
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Rating Breakdown</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {ratingBreakdown.map((row) => (
              <div className="pt-rating-bar" key={row.star}>
                <span style={{ width: 24, textAlign: "right", fontSize: 13, fontWeight: 600 }}>
                  {row.star}
                </span>
                <IconStar size={14} style={{ color: "var(--lime)" }} />
                <div className="pt-rating-bar-track">
                  <div
                    className="pt-rating-bar-fill"
                    style={{ width: `${row.percent}%` }}
                  />
                </div>
                <span style={{ width: 28, fontSize: 12, opacity: 0.6 }}>{row.count}</span>
              </div>
            ))}
          </div>

          {/* Pros & Cons (aggregated from reviews) */}
          {reviews && reviews.length > 0 && (
            <div className="pt-pros-cons">
              <div className="pt-pros">
                <h4 style={{ color: "var(--green)", marginBottom: 8 }}>Common Pros</h4>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {[...new Set(reviews.flatMap((r: FirmReview) => r.pros))]
                    .slice(0, 5)
                    .map((pro, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{pro}</li>
                    ))}
                </ul>
              </div>
              <div className="pt-cons">
                <h4 style={{ color: "var(--red)", marginBottom: 8 }}>Common Cons</h4>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {[...new Set(reviews.flatMap((r: FirmReview) => r.cons))]
                    .slice(0, 5)
                    .map((con, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{con}</li>
                    ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === Reviews Tab === */}
      {activeTab === "reviews" && (
        <div>
          {/* Sort Controls */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <Button
              variant={reviewSort === "recent" ? "lime" : "ghost"}
              size="sm"
              onClick={() => setReviewSort("recent")}
            >
              Most Recent
            </Button>
            <Button
              variant={reviewSort === "helpful" ? "lime" : "ghost"}
              size="sm"
              onClick={() => setReviewSort("helpful")}
            >
              Most Helpful
            </Button>
          </div>

          {/* Write Review Form */}
          {session?.user && (
            <form className="pt-review-form" onSubmit={handleSubmit(onSubmitReview)}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Write a Review</h3>

              {/* Star Picker */}
              <div style={{ marginBottom: 12 }}>
                <label className="pt-input-label">Your Rating</label>
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setValue("rating", star)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 2,
                        color: star <= watchedRating ? "var(--lime)" : "var(--border)",
                      }}
                    >
                      <IconStar size={28} />
                    </button>
                  ))}
                </div>
                {errors.rating && (
                  <p style={{ color: "var(--red)", fontSize: 13, marginTop: 4 }}>
                    {errors.rating.message}
                  </p>
                )}
              </div>

              {/* Title */}
              <Input
                label="Title"
                placeholder="Summarize your experience"
                error={errors.title?.message}
                {...register("title")}
              />

              {/* Body */}
              <div style={{ marginTop: 12 }}>
                <Textarea
                  label="Your Review"
                  placeholder="Share the details of your experience with this firm..."
                  rows={5}
                  error={errors.body?.message}
                  {...register("body")}
                />
              </div>

              {/* Pros List */}
              <div style={{ marginTop: 12 }}>
                <label className="pt-input-label">Pros</label>
                {prosFields.map((field, idx) => (
                  <div key={field.id} style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <input
                      className="pt-input"
                      placeholder={`Pro ${idx + 1}`}
                      {...register(`pros.${idx}` as const)}
                    />
                    {prosFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePro(idx)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
                      >
                        <IconClose size={16} />
                      </button>
                    )}
                  </div>
                ))}
                {prosFields.length < 10 && (
                  <button
                    type="button"
                    onClick={() => appendPro("")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--lime)",
                      fontSize: 13,
                      fontWeight: 600,
                      marginTop: 6,
                      padding: 0,
                    }}
                  >
                    <IconPlus size={14} /> Add Pro
                  </button>
                )}
                {errors.pros && (
                  <p style={{ color: "var(--red)", fontSize: 13, marginTop: 4 }}>
                    {typeof errors.pros.message === "string"
                      ? errors.pros.message
                      : "Add at least one pro"}
                  </p>
                )}
              </div>

              {/* Cons List */}
              <div style={{ marginTop: 12 }}>
                <label className="pt-input-label">Cons</label>
                {consFields.map((field, idx) => (
                  <div key={field.id} style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <input
                      className="pt-input"
                      placeholder={`Con ${idx + 1}`}
                      {...register(`cons.${idx}` as const)}
                    />
                    {consFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCon(idx)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
                      >
                        <IconClose size={16} />
                      </button>
                    )}
                  </div>
                ))}
                {consFields.length < 10 && (
                  <button
                    type="button"
                    onClick={() => appendCon("")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--red)",
                      fontSize: 13,
                      fontWeight: 600,
                      marginTop: 6,
                      padding: 0,
                    }}
                  >
                    <IconPlus size={14} /> Add Con
                  </button>
                )}
                {errors.cons && (
                  <p style={{ color: "var(--red)", fontSize: 13, marginTop: 4 }}>
                    {typeof errors.cons.message === "string"
                      ? errors.cons.message
                      : "Add at least one con"}
                  </p>
                )}
              </div>

              {/* Tags */}
              <div style={{ marginTop: 12 }}>
                <label className="pt-input-label">Tags</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {reviewTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`pt-filter-chip ${watchedTags?.includes(tag.id) ? "active" : ""}`}
                    >
                      {tag.emoji} {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Anonymous Toggle */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 16,
                }}
              >
                <span style={{ fontSize: 14 }}>Post anonymously</span>
                <Toggle
                  checked={watchedAnonymous}
                  onChange={() => setValue("is_anonymous", !watchedAnonymous)}
                />
              </div>

              {/* Preview Toggle */}
              <div style={{ marginTop: 12 }}>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
                  {showPreview ? "Hide Preview" : "Preview"}
                </Button>
              </div>

              {/* Preview */}
              {showPreview && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 16,
                    borderRadius: "var(--r-md)",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <IconStar
                        key={s}
                        size={16}
                        style={{ color: s <= watchedRating ? "var(--lime)" : "var(--border)" }}
                      />
                    ))}
                  </div>
                  <h4 style={{ margin: "0 0 4px" }}>{watch("title") || "Review title"}</h4>
                  <p style={{ opacity: 0.8, fontSize: 14, lineHeight: 1.6 }}>
                    {watch("body") || "Your review will appear here..."}
                  </p>
                </div>
              )}

              {/* Submit */}
              <div style={{ marginTop: 16 }}>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={createReview.isPending}
                >
                  {createReview.isPending ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </form>
          )}

          {/* Reviews List */}
          {reviewsLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ padding: 16, borderRadius: "var(--r-md)", background: "var(--surface)" }}>
                  <Skeleton width={120} height={16} />
                  <Skeleton width="80%" height={14} />
                  <Skeleton width="100%" height={60} />
                </div>
              ))}
            </div>
          )}

          {!reviewsLoading && reviews && reviews.length === 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ opacity: 0.6, textAlign: "center" }}>
                No reviews yet. Be the first to share your experience!
              </p>
            </div>
          )}

          {reviews && reviews.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
              {reviews.map((review: FirmReview) => (
                <div
                  key={review.id}
                  style={{
                    padding: 16,
                    borderRadius: "var(--r-md)",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {/* Author Row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <Avatar
                      src={review.is_anonymous ? null : review.author?.avatar_url}
                      name={review.is_anonymous ? "Anonymous" : review.author?.display_name ?? "User"}
                      size="sm"
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {review.is_anonymous ? "Anonymous" : review.author?.display_name ?? "User"}
                        {review.verified_purchase && (
                          <Badge variant="green" className="ml-2">Verified</Badge>
                        )}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.5 }}>{timeAgo(review.created_at)}</div>
                    </div>
                  </div>

                  {/* Star Rating + Title */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <RatingStars rating={review.rating} size={14} />
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{review.title}</span>
                  </div>

                  {/* Body */}
                  <p style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.85, margin: "0 0 12px" }}>
                    {review.body}
                  </p>

                  {/* Pros/Cons */}
                  <div className="pt-pros-cons" style={{ marginBottom: 12 }}>
                    {review.pros.length > 0 && (
                      <div className="pt-pros">
                        <strong style={{ color: "var(--green)", fontSize: 12 }}>Pros</strong>
                        <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 13 }}>
                          {review.pros.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {review.cons.length > 0 && (
                      <div className="pt-cons">
                        <strong style={{ color: "var(--red)", fontSize: 12 }}>Cons</strong>
                        <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 13 }}>
                          {review.cons.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {review.tags.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                      {review.tags.map((tagId) => {
                        const tag = reviewTags.find((t) => t.id === tagId);
                        return tag ? (
                          <Badge key={tagId}>
                            {tag.emoji} {tag.label}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}

                  {/* Helpful Button */}
                  <button
                    onClick={() => voteReview.mutate(review.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "none",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--r-sm)",
                      padding: "6px 12px",
                      cursor: "pointer",
                      fontSize: 13,
                      color: "inherit",
                    }}
                  >
                    <IconThumbUp size={14} />
                    Helpful ({review.helpful_count})
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === Rules Tab === */}
      {activeTab === "rules" && (
        <div style={{ padding: "24px 0" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Trading Rules</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            {firm.max_drawdown && (
              <div style={{ padding: 16, borderRadius: "var(--r-md)", background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ opacity: 0.5, fontSize: 12, marginBottom: 4 }}>Max Drawdown</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{firm.max_drawdown}</div>
              </div>
            )}
            {firm.profit_split && (
              <div style={{ padding: 16, borderRadius: "var(--r-md)", background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ opacity: 0.5, fontSize: 12, marginBottom: 4 }}>Profit Split</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{firm.profit_split}</div>
              </div>
            )}
            {firm.platforms.length > 0 && (
              <div style={{ padding: 16, borderRadius: "var(--r-md)", background: "var(--surface)", border: "1px solid var(--border)", gridColumn: "1 / -1" }}>
                <div style={{ opacity: 0.5, fontSize: 12, marginBottom: 4 }}>Platforms</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {firm.platforms.map((p) => (
                    <Badge key={p}>{p}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          {firm.website && (
            <div style={{ marginTop: 16 }}>
              <a
                href={firm.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--lime)", fontWeight: 600, fontSize: 14 }}
              >
                Visit Official Website
              </a>
            </div>
          )}
        </div>
      )}

      {/* === Analytics Tab === */}
      {activeTab === "analytics" && (
        <div style={{ padding: "24px 0" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Firm Analytics</h3>
          <div className="pt-firm-stats" style={{ flexWrap: "wrap" }}>
            <div className="pt-firm-stat">
              <span style={{ opacity: 0.5, fontSize: 11 }}>Average Rating</span>
              <span style={{ fontWeight: 700, fontSize: 24 }}>{firm.rating_avg.toFixed(1)}</span>
            </div>
            <div className="pt-firm-stat">
              <span style={{ opacity: 0.5, fontSize: 11 }}>Total Reviews</span>
              <span style={{ fontWeight: 700, fontSize: 24 }}>{firm.review_count}</span>
            </div>
            {firm.pass_rate && (
              <div className="pt-firm-stat">
                <span style={{ opacity: 0.5, fontSize: 11 }}>Pass Rate</span>
                <span style={{ fontWeight: 700, fontSize: 24 }}>{firm.pass_rate}</span>
              </div>
            )}
            {firm.total_payouts && (
              <div className="pt-firm-stat">
                <span style={{ opacity: 0.5, fontSize: 11 }}>Total Payouts</span>
                <span style={{ fontWeight: 700, fontSize: 24 }}>{firm.total_payouts}</span>
              </div>
            )}
          </div>
          {firm.founded && (
            <p style={{ marginTop: 16, fontSize: 14, opacity: 0.6 }}>
              Operating since {firm.founded}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
