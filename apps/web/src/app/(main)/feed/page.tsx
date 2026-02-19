"use client";

import { useMemo, useCallback, useRef, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  IconPhoto,
  IconChart,
  IconBarChart,
  IconHeart,
  IconHeartOutline,
  IconComment,
  IconRepost,
  IconShare,
  IconBookmark,
  IconEye,
  IconVerified,
  IconFire,
  IconTrendUp,
  IconQuote,
  IconReply,
  IconClose,
} from "@propian/shared/icons";
import {
  useSession,
  useCurrentProfile,
  useFeed,
  useCreatePost,
  useLikePost,
  useBookmark,
  useRepost,
  useComments,
  useCreateComment,
  useLikeComment,
  useBookmarkComment,
} from "@propian/shared/hooks";
import { createPostSchema } from "@propian/shared/validation";
import type { CreatePostInput } from "@propian/shared/validation";
import type { Post, Comment } from "@propian/shared/types";
import { createBrowserClient } from "@/lib/supabase/client";
import { timeAgo } from "@propian/shared/utils";
import { formatCompact } from "@propian/shared/utils";
import { parseChartRef, buildChartRef, buildMiniChartUrl, buildFullChartUrl, formatChartLabel } from "@propian/shared/utils";
import type { ChartInterval } from "@propian/shared/constants";
import { ChartPickerWeb } from "@/components/feed/ChartPickerWeb";

/* ------------------------------------------------------------------ */
/*  Mock sidebar data                                                  */
/* ------------------------------------------------------------------ */

const TRENDING_TAGS = [
  { tag: "#FTMOChallenge", count: 1243 },
  { tag: "#GoldSetup", count: 894 },
  { tag: "#NFPTrade", count: 671 },
  { tag: "#RiskManagement", count: 542 },
  { tag: "#FundedTrader", count: 438 },
  { tag: "#EURUSD", count: 387 },
  { tag: "#SmartMoney", count: 312 },
];

const SUGGESTED_TRADERS = [
  { id: "s1", name: "Marcus Chen", handle: "@marcusfx", avatar: null, verified: true },
  { id: "s2", name: "Sarah Kim", handle: "@sarahswing", avatar: null, verified: false },
  { id: "s3", name: "Alex Rivera", handle: "@alexrisk", avatar: null, verified: true },
  { id: "s4", name: "Nina Volkov", handle: "@ninavtrading", avatar: null, verified: false },
];

/* ------------------------------------------------------------------ */
/*  Action bar — shared between regular & repost cards                 */
/* ------------------------------------------------------------------ */

function ActionBar({
  post,
  onLike,
  onBookmark,
  onRepost,
  onQuote,
  onComment,
  onShare,
  isRepostMenuOpen,
  onToggleRepostMenu,
}: {
  post: Post;
  onLike: (postId: string, isLiked: boolean) => void;
  onBookmark: (postId: string, isBookmarked: boolean) => void;
  onRepost: (postId: string, isReposted: boolean) => void;
  onQuote: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  isRepostMenuOpen: boolean;
  onToggleRepostMenu: (postId: string) => void;
}) {
  return (
    <div className="pt-post-actions">
      <button className="pt-post-action" onClick={() => onComment(post.id)}>
        <IconComment size={16} />
        <span>{post.comment_count > 0 ? formatCompact(post.comment_count) : ""}</span>
      </button>

      {/* Repost with dropdown */}
      <div style={{ position: "relative", flex: 1, display: "flex", justifyContent: "center" }}>
        <button
          className={`pt-post-action ${post.is_reposted ? "reposted" : ""}`}
          onClick={() => onToggleRepostMenu(post.id)}
        >
          <IconRepost size={20} style={post.is_reposted ? { color: "var(--green)" } : undefined} />
          <span>{post.repost_count > 0 ? formatCompact(post.repost_count) : ""}</span>
        </button>
        {isRepostMenuOpen && (
          <div className="pt-repost-menu">
            <button onClick={() => { onRepost(post.id, !!post.is_reposted); onToggleRepostMenu(post.id); }}>
              <IconRepost size={16} style={post.is_reposted ? { color: "var(--green)" } : undefined} />
              {post.is_reposted ? "Undo Repost" : "Repost"}
            </button>
            <button onClick={() => { onQuote(post.id); onToggleRepostMenu(post.id); }}>
              <IconQuote size={16} />
              Quote
            </button>
          </div>
        )}
      </div>

      <button
        className={`pt-post-action ${post.is_liked ? "liked" : ""}`}
        onClick={() => onLike(post.id, !!post.is_liked)}
      >
        {post.is_liked ? (
          <IconHeart size={17} style={{ color: "var(--red)" }} />
        ) : (
          <IconHeartOutline size={17} />
        )}
        <span>{post.like_count > 0 ? formatCompact(post.like_count) : ""}</span>
      </button>

      <div className="pt-post-action" style={{ cursor: "default" }}>
        <IconEye size={18} />
        <span>{post.view_count > 0 ? formatCompact(post.view_count) : ""}</span>
      </div>

      <button
        className={`pt-post-action ${post.is_bookmarked ? "bookmarked" : ""}`}
        onClick={() => onBookmark(post.id, !!post.is_bookmarked)}
      >
        <IconBookmark size={17} style={post.is_bookmarked ? { color: "var(--lime)" } : undefined} />
      </button>

      <button className="pt-post-action" onClick={() => onShare(post.id)}>
        <IconShare size={19} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Post Card                                                          */
/* ------------------------------------------------------------------ */

function PostCard({
  post,
  onLike,
  onBookmark,
  onRepost,
  onQuote,
  onComment,
  onShare,
  onChartExpand,
  onImageExpand,
  isCommentsOpen,
  isRepostMenuOpen,
  onToggleRepostMenu,
  supabase,
}: {
  post: Post;
  onLike: (postId: string, isLiked: boolean) => void;
  onBookmark: (postId: string, isBookmarked: boolean) => void;
  onRepost: (postId: string, isReposted: boolean) => void;
  onQuote: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onChartExpand?: (url: string) => void;
  onImageExpand?: (url: string) => void;
  isCommentsOpen: boolean;
  isRepostMenuOpen: boolean;
  onToggleRepostMenu: (postId: string) => void;
  supabase: ReturnType<typeof createBrowserClient>;
}) {
  // Simple repost — show "reposted by" header with original post content
  if (post.type === "repost" && post.quoted_post) {
    const original = post.quoted_post;
    const reposter = post.author;
    const originalAuthor = original.author;

    return (
      <article className="pt-post">
        {/* Reposted by header */}
        <div className="pt-repost-banner">
          <IconRepost size={14} style={{ color: "var(--green)" }} />
          <span>{reposter?.display_name ?? "Someone"} reposted</span>
        </div>

        {/* Clickable content area → post detail */}
        <a href={`/post/${original.id}`} className="pt-post-link">
          {/* Original post header */}
          <div className="pt-post-header">
            <Avatar
              src={originalAuthor?.avatar_url}
              name={originalAuthor?.display_name ?? "User"}
              size="md"
            />
            <div className="pt-post-author">
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontWeight: 600 }}>{originalAuthor?.display_name ?? "User"}</span>
                {originalAuthor?.is_verified && (
                  <IconVerified size={14} style={{ color: "var(--lime)" }} />
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="pt-post-handle">@{originalAuthor?.username ?? "user"}</span>
                <span className="pt-post-time">{timeAgo(original.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Original body */}
          <div className="pt-post-body">{original.content}</div>
        </a>

        {/* Actions target the original post */}
        <ActionBar
          post={original}
          onLike={onLike}
          onBookmark={onBookmark}
          onRepost={onRepost}
          onQuote={onQuote}
          onComment={onComment}
          onShare={onShare}
          isRepostMenuOpen={isRepostMenuOpen}
          onToggleRepostMenu={onToggleRepostMenu}
        />

        {/* Inline comments on original */}
        {isCommentsOpen && (
          <InlineComments postId={original.id} supabase={supabase} />
        )}
      </article>
    );
  }

  // Simple repost where original was deleted
  if (post.type === "repost" && !post.quoted_post) {
    return (
      <article className="pt-post">
        <div className="pt-repost-banner">
          <IconRepost size={14} style={{ color: "var(--green)" }} />
          <span>{post.author?.display_name ?? "Someone"} reposted</span>
        </div>
        <div className="pt-quoted-embed pt-quoted-embed--deleted">
          <p>This post is unavailable</p>
        </div>
      </article>
    );
  }

  // Regular post (text, image, poll, quote)
  return (
    <article className="pt-post">
      {/* Clickable content area → post detail */}
      <a href={`/post/${post.id}`} className="pt-post-link">
        {/* Header */}
        <div className="pt-post-header">
          <Avatar
            src={post.author?.avatar_url}
            name={post.author?.display_name ?? "User"}
            size="md"
          />
          <div className="pt-post-author">
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontWeight: 600 }}>{post.author?.display_name ?? "User"}</span>
              {post.author?.is_verified && (
                <IconVerified size={14} style={{ color: "var(--lime)" }} />
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="pt-post-handle">@{post.author?.username ?? "user"}</span>
              <span className="pt-post-time">{timeAgo(post.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        {post.content && <div className="pt-post-body">{post.content}</div>}

        {/* Quoted post embed */}
        {post.type === "quote" && post.quoted_post && (
          <div
            className="pt-quoted-embed pt-quoted-embed--clickable"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = `/post/${post.quoted_post!.id}`;
            }}
          >
            <div className="pt-quoted-embed-header">
              <Avatar
                src={post.quoted_post.author?.avatar_url}
                name={post.quoted_post.author?.display_name ?? "User"}
                size="sm"
              />
              <span className="pt-quoted-embed-name">
                {post.quoted_post.author?.display_name ?? "Unknown"}
              </span>
              {post.quoted_post.author?.is_verified && (
                <IconVerified size={12} style={{ color: "var(--lime)" }} />
              )}
              <span className="pt-quoted-embed-handle">
                @{post.quoted_post.author?.username ?? "user"}
              </span>
            </div>
            {post.quoted_post.content && (
              <p className="pt-quoted-embed-body">{post.quoted_post.content}</p>
            )}
            {/* Quoted post media */}
            {post.quoted_post.type === "image" && post.quoted_post.media_urls?.[0] && (
              <div className="pt-quoted-embed-media">
                <img
                  src={post.quoted_post.media_urls[0]}
                  alt="Quoted post image"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            )}
            {post.quoted_post.type === "chart" && post.quoted_post.media_urls?.[0] && (() => {
              const qRef = parseChartRef(post.quoted_post.media_urls[0]);
              if (!qRef) return null;
              return (
                <div className="pt-quoted-embed-chart">
                  <iframe
                    src={buildMiniChartUrl(qRef)}
                    width="100%"
                    height="100%"
                    style={{ border: "none", pointerEvents: "none" }}
                    loading="lazy"
                    sandbox="allow-scripts allow-same-origin"
                  />
                  <div className="pt-chart-embed-badge">
                    <IconChart size={12} />
                    <span>{formatChartLabel(qRef)}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Deleted quoted post fallback */}
        {post.type === "quote" && !post.quoted_post && (
          <div className="pt-quoted-embed pt-quoted-embed--deleted">
            <p>This post is unavailable</p>
          </div>
        )}

        {/* Image attachment */}
        {post.type === "image" && post.media_urls.length > 0 && (
          <div
            className="pt-post-image"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onImageExpand?.(post.media_urls[0]);
            }}
          >
            <img
              src={post.media_urls[0]}
              alt="Trading screenshot"
              loading="lazy"
              decoding="async"
            />
          </div>
        )}

        {/* Chart embed (for type='chart') */}
        {post.type === "chart" && post.media_urls?.[0] && (() => {
          const chartRef = parseChartRef(post.media_urls[0]);
          if (!chartRef) return null;
          return (
            <div
              className="pt-chart-embed"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChartExpand?.(buildFullChartUrl(chartRef));
              }}
            >
              <iframe
                src={buildMiniChartUrl(chartRef)}
                width="100%"
                height="100%"
                style={{ border: "none", pointerEvents: "none" }}
                loading="lazy"
                sandbox="allow-scripts allow-same-origin"
              />
              <div className="pt-chart-embed-badge">
                <IconChart size={12} />
                <span>{formatChartLabel(chartRef)}</span>
              </div>
            </div>
          );
        })()}
      </a>

      {/* Actions bar */}
      <ActionBar
        post={post}
        onLike={onLike}
        onBookmark={onBookmark}
        onRepost={onRepost}
        onQuote={onQuote}
        onComment={onComment}
        onShare={onShare}
        isRepostMenuOpen={isRepostMenuOpen}
        onToggleRepostMenu={onToggleRepostMenu}
      />

      {/* Inline comment section */}
      {isCommentsOpen && (
        <InlineComments postId={post.id} supabase={supabase} />
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline Comments Section                                            */
/* ------------------------------------------------------------------ */

function InlineComments({
  postId,
  supabase,
}: {
  postId: string;
  supabase: ReturnType<typeof createBrowserClient>;
}) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string } | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const { query } = useComments(supabase, postId);
  const createComment = useCreateComment(supabase);
  const likeComment = useLikeComment(supabase);
  const bookmarkComment = useBookmarkComment(supabase);

  const comments: Comment[] = useMemo(
    () => (query.data?.pages?.flatMap((page: unknown) => (Array.isArray(page) ? page : [])) ?? []) as Comment[],
    [query.data],
  );

  const handleSend = () => {
    const content = text.trim();
    if (!content || createComment.isPending) return;
    createComment.mutate(
      { postId, content, parentId: replyTo?.id ?? null },
      {
        onSuccess: () => {
          setText("");
          setReplyTo(null);
        },
      },
    );
  };

  const handleReply = (comment: Comment) => {
    setReplyTo({ id: comment.id, authorName: comment.author?.display_name || "Unknown" });
  };

  const handleLikeComment = (comment: Comment) => {
    likeComment.mutate({
      commentId: comment.id,
      postId,
      action: comment.is_liked ? "unlike" : "like",
    });
  };

  const handleBookmarkComment = (comment: Comment) => {
    bookmarkComment.mutate({
      commentId: comment.id,
      postId,
      action: comment.is_bookmarked ? "unbookmark" : "bookmark",
    });
  };

  const handleShareComment = async (comment: Comment) => {
    try {
      await navigator.clipboard.writeText(
        `${comment.author?.display_name || "Someone"} on Propian: "${comment.content}"`
      );
    } catch (_) {}
  };

  const toggleThread = (commentId: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  /* Flatten all nested replies into a single list — no cascading */
  const flattenReplies = (replies: Comment[]): Comment[] => {
    const flat: Comment[] = [];
    for (const reply of replies) {
      flat.push(reply);
      if (reply.replies && reply.replies.length > 0) {
        flat.push(...flattenReplies(reply.replies));
      }
    }
    return flat;
  };

  const renderSingleComment = (comment: Comment, isReply: boolean) => (
    <div key={comment.id} className={`pt-comment-thread${isReply ? " pt-comment-reply" : ""}`}>
      <div className="pt-comment">
        {isReply && <div className="pt-thread-line" />}
        <Avatar
          src={comment.author?.avatar_url}
          name={comment.author?.display_name ?? "User"}
          size="sm"
        />
        <div className="pt-comment-body">
          <div className="pt-comment-header">
            <span className="pt-comment-author">
              {comment.author?.display_name ?? "Unknown"}
            </span>
            {comment.author?.is_verified && (
              <IconVerified size={12} style={{ color: "var(--lime)" }} />
            )}
            <span className="pt-comment-time">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="pt-comment-text">{comment.content}</p>

          <div className="pt-comment-actions">
            <button className="pt-comment-action-btn" onClick={() => handleReply(comment)} title="Reply">
              <IconReply size={14} />
              {(comment.reply_count ?? 0) > 0 && <span>{formatCompact(comment.reply_count ?? 0)}</span>}
            </button>
            <button className={`pt-comment-action-btn${comment.is_liked ? " pt-comment-action-liked" : ""}`} onClick={() => handleLikeComment(comment)} title="Like">
              {comment.is_liked ? <IconHeart size={14} /> : <IconHeartOutline size={14} />}
              {comment.like_count > 0 && <span>{formatCompact(comment.like_count)}</span>}
            </button>
            <button className={`pt-comment-action-btn${comment.is_bookmarked ? " pt-comment-action-bookmarked" : ""}`} onClick={() => handleBookmarkComment(comment)} title="Bookmark">
              <IconBookmark size={14} />
            </button>
            <button className="pt-comment-action-btn" onClick={() => handleShareComment(comment)} title="Share">
              <IconShare size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCommentWithReplies = (comment: Comment) => {
    const allReplies = comment.replies ? flattenReplies(comment.replies) : [];
    const isExpanded = expandedThreads.has(comment.id);
    const visibleReplies = isExpanded ? allReplies : allReplies.slice(0, 1);
    const hiddenCount = allReplies.length - 1;

    return (
      <div key={comment.id}>
        {renderSingleComment(comment, false)}

        {allReplies.length > 0 && (
          <div className="pt-comment-replies">
            {visibleReplies.map((reply) => renderSingleComment(reply, true))}

            {hiddenCount > 0 && (
              <button
                className="pt-view-more-replies"
                onClick={() => toggleThread(comment.id)}
              >
                {isExpanded
                  ? "Show less"
                  : `View ${hiddenCount} more ${hiddenCount === 1 ? "reply" : "replies"}`}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pt-comments">
      {query.isLoading ? (
        <div className="pt-comments-loading">
          {[1, 2].map((i) => (
            <div key={i} className="pt-comment">
              <Skeleton width={28} height={28} borderRadius="50%" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <Skeleton width={100} height={12} borderRadius={4} />
                <Skeleton width="80%" height={12} borderRadius={4} />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="pt-comments-empty">No replies yet. Start the conversation!</p>
      ) : (
        <div className="pt-comments-list">
          {comments.map((comment) => renderCommentWithReplies(comment))}
        </div>
      )}

      <div className="pt-comment-input">
        {replyTo && (
          <div className="pt-reply-indicator">
            <span>
              Replying to <strong>{replyTo.authorName}</strong>
            </span>
            <button onClick={() => setReplyTo(null)} className="pt-reply-indicator-close">
              ✕
            </button>
          </div>
        )}
        <div className="pt-comment-input-row">
          <input
            type="text"
            placeholder={replyTo ? `Reply to ${replyTo.authorName}...` : "Write a reply..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            maxLength={500}
            dir="auto"
          />
          <Button
            variant="lime"
            size="sm"
            onClick={handleSend}
            disabled={!text.trim() || createComment.isPending}
          >
            {createComment.isPending ? "..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Post Skeleton                                                      */
/* ------------------------------------------------------------------ */

function PostSkeleton() {
  return (
    <div className="pt-post">
      <div className="pt-post-header">
        <Skeleton width={40} height={40} borderRadius="50%" />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Skeleton width={140} height={14} borderRadius={4} />
          <Skeleton width={100} height={12} borderRadius={4} />
        </div>
      </div>
      <div className="pt-post-body">
        <Skeleton width="100%" height={14} borderRadius={4} />
        <Skeleton width="80%" height={14} borderRadius={4} />
        <Skeleton width="60%" height={14} borderRadius={4} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Feed Page                                                     */
/* ------------------------------------------------------------------ */

export default function FeedPage() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const { data: session } = useSession(supabase);
  const { data: profile } = useCurrentProfile(supabase, session?.user?.id);

  /* Feed query */
  const {
    data: feedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useFeed(supabase);

  /* Mutations */
  const createPost = useCreatePost(supabase);
  const likePost = useLikePost(supabase);
  const bookmarkPost = useBookmark(supabase);
  const repostPost = useRepost(supabase);

  /* Composer form */
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: { content: "", type: "text", sentiment_tag: null, media_urls: [] },
  });

  const onSubmitPost = handleSubmit(
    async (data) => {
      const payload = { ...data };
      if (composerChartRef) {
        payload.type = "chart";
        payload.media_urls = [composerChartRef];
      } else if (composerImageFile) {
        setIsUploadingImage(true);
        try {
          const { uploadPostImage } = await import("@propian/shared/api");
          const url = await uploadPostImage(supabase, {
            blob: composerImageFile,
            type: composerImageFile.type,
          });
          payload.type = "image";
          payload.media_urls = [url];
        } catch (err) {
          console.error("[Propian] Image upload error:", err);
          setIsUploadingImage(false);
          return;
        }
        setIsUploadingImage(false);
      }
      createPost.mutate(payload, {
        onSuccess: () => {
          reset();
          setComposerChartRef(null);
          clearComposerImage();
        },
        onError: (err) => {
          console.error("[Propian] Create post error:", err);
        },
      });
    },
    (formErrors) => {
      console.error("[Propian] Form validation errors:", formErrors);
    },
  );

  /* Chart picker & composer chart state */
  const [showChartPicker, setShowChartPicker] = useState(false);
  const [composerChartRef, setComposerChartRef] = useState<string | null>(null);
  const [fullscreenChartUrl, setFullscreenChartUrl] = useState<string | null>(null);

  /* Image upload & lightbox state */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [composerImageFile, setComposerImageFile] = useState<File | null>(null);
  const [composerImagePreviewUrl, setComposerImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);

  const handleChartSelect = useCallback(
    (data: { exchange: string; symbol: string; interval: ChartInterval }) => {
      const ref = buildChartRef(data.exchange, data.symbol, data.interval);
      setComposerChartRef(ref);
      setShowChartPicker(false);
    },
    [],
  );

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        alert("Image must be under 10MB");
        return;
      }
      setComposerImageFile(file);
      setComposerImagePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      // Clear chart — mutually exclusive
      setComposerChartRef(null);
      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [],
  );

  const clearComposerImage = useCallback(() => {
    setComposerImageFile(null);
    setComposerImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  /* Comment, share, repost menu, & quote state */
  const [expandedCommentPostId, setExpandedCommentPostId] = useState<string | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [repostMenuPostId, setRepostMenuPostId] = useState<string | null>(null);
  const [quotePostId, setQuotePostId] = useState<string | null>(null);
  const [quoteContent, setQuoteContent] = useState("");

  /* Handlers */
  const handleLike = useCallback(
    (postId: string, isLiked: boolean) => {
      likePost.mutate({ postId, action: isLiked ? "unlike" : "like" });
    },
    [likePost],
  );

  const handleBookmark = useCallback(
    (postId: string, isBookmarked: boolean) => {
      bookmarkPost.mutate({ postId, action: isBookmarked ? "unbookmark" : "bookmark" });
    },
    [bookmarkPost],
  );

  const handleRepost = useCallback(
    (postId: string, isReposted: boolean) => {
      repostPost.mutate({ postId, action: isReposted ? "unrepost" : "repost" });
    },
    [repostPost],
  );

  const handleComment = useCallback(
    (postId: string) => {
      setExpandedCommentPostId((prev) => (prev === postId ? null : postId));
    },
    [],
  );

  const handleShare = useCallback(
    async (postId: string) => {
      const url = `${window.location.origin}/post/${postId}`;
      try {
        if (navigator.share) {
          await navigator.share({ url });
        } else {
          await navigator.clipboard.writeText(url);
          setCopiedPostId(postId);
          setTimeout(() => setCopiedPostId(null), 2000);
        }
      } catch (_) {}
    },
    [],
  );

  const handleToggleRepostMenu = useCallback(
    (postId: string) => {
      setRepostMenuPostId((prev) => (prev === postId ? null : postId));
    },
    [],
  );

  const handleQuote = useCallback(
    (postId: string) => {
      setQuotePostId(postId);
      setRepostMenuPostId(null);
    },
    [],
  );

  const handleQuoteSubmit = useCallback(() => {
    if (!quoteContent.trim() || !quotePostId) return;
    createPost.mutate(
      { content: quoteContent.trim(), type: "quote", quoted_post_id: quotePostId },
      {
        onSuccess: () => {
          setQuoteContent("");
          setQuotePostId(null);
        },
      },
    );
  }, [quoteContent, quotePostId, createPost]);

  /* Infinite scroll observer */
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  /* Flatten pages */
  const posts: Post[] = feedData?.pages.flatMap((page) => page.data ?? []) ?? [];

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <section className="pt-section">
      <div className="pt-feed-layout">

        {/* ============ Left column: Composer + Feed ============ */}
        <div>
          {/* Composer */}
          <form className="pt-composer" onSubmit={onSubmitPost}>
            <div className="pt-composer-top">
              <Avatar
                src={profile?.avatar_url}
                name={profile?.display_name ?? "You"}
                size="md"
              />
              <textarea
                {...register("content")}
                placeholder="What's your trade thesis today?"
                rows={2}
                dir="auto"
              />
            </div>

            {errors.content && (
              <p style={{ color: "var(--red)", fontSize: 13, margin: "4px 0 0 52px" }}>
                {errors.content.message}
              </p>
            )}

            {/* Chart preview in composer */}
            {composerChartRef && (() => {
              const ref = parseChartRef(composerChartRef);
              if (!ref) return null;
              return (
                <div className="pt-chart-preview">
                  <div className="pt-chart-preview-badge">
                    <IconChart size={14} />
                    <span>{formatChartLabel(ref)}</span>
                    <button
                      type="button"
                      className="pt-chart-preview-remove"
                      onClick={() => setComposerChartRef(null)}
                      title="Remove chart"
                    >
                      <IconClose size={14} />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Image preview in composer */}
            {composerImagePreviewUrl && (
              <div className="pt-image-preview">
                <div className="pt-image-preview-thumb">
                  <img src={composerImagePreviewUrl} alt="Preview" />
                  <button
                    type="button"
                    className="pt-image-preview-remove"
                    onClick={clearComposerImage}
                    title="Remove image"
                  >
                    <IconClose size={12} />
                  </button>
                </div>
              </div>
            )}

            <div className="pt-composer-actions">
              <div className="pt-composer-tools">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="pt-file-input"
                  onChange={handleImageSelect}
                />
                <button
                  type="button"
                  className={`pt-composer-tool ${composerImageFile ? "active" : ""}`}
                  title="Photo"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <IconPhoto size={20} />
                </button>
                <button
                  type="button"
                  className={`pt-composer-tool ${composerChartRef ? "active" : ""}`}
                  title="Chart"
                  onClick={() => setShowChartPicker(true)}
                >
                  <IconChart size={20} />
                </button>
                <button type="button" className="pt-composer-tool" title="Poll">
                  <IconBarChart size={20} />
                </button>
              </div>
              <Button
                variant="lime"
                size="sm"
                type="submit"
                disabled={createPost.isPending || isUploadingImage}
              >
                {isUploadingImage ? "Uploading..." : createPost.isPending ? "Posting..." : "Post"}
              </Button>
            </div>
          </form>

          {/* Feed list */}
          {isLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </div>
          )}

          {isError && (
            <EmptyState
              title="Failed to load feed"
              description="Something went wrong. Please try again later."
            />
          )}

          {!isLoading && !isError && posts.length === 0 && (
            <EmptyState
              icon={<IconChart size={32} />}
              title="Your feed is empty"
              description="Follow traders or post your first trade thesis to get started."
            />
          )}

          {posts.map((post) => (
            <div key={post.id} style={{ position: "relative" }}>
              <PostCard
                post={post}
                onLike={handleLike}
                onBookmark={handleBookmark}
                onRepost={handleRepost}
                onQuote={handleQuote}
                onComment={handleComment}
                onShare={handleShare}
                onChartExpand={setFullscreenChartUrl}
                onImageExpand={setFullscreenImageUrl}
                isCommentsOpen={expandedCommentPostId === post.id}
                isRepostMenuOpen={repostMenuPostId === post.id}
                onToggleRepostMenu={handleToggleRepostMenu}
                supabase={supabase}
              />
              {copiedPostId === post.id && (
                <div className="pt-copied-toast">Link copied!</div>
              )}
            </div>
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} style={{ height: 1 }} />
          {isFetchingNextPage && <PostSkeleton />}
        </div>

        {/* ============ Right column: Sidebar ============ */}
        <aside>
          {/* Trending hashtags */}
          <div className="pt-trending">
            <h3 className="pt-trending-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IconFire size={18} style={{ color: "var(--lime)" }} />
              Trending
            </h3>
            {TRENDING_TAGS.map((item) => (
              <div key={item.tag} className="pt-trend-item">
                <span className="pt-trend-tag">{item.tag}</span>
                <span className="pt-trend-count">{formatCompact(item.count)} posts</span>
              </div>
            ))}
          </div>

          {/* Suggested traders */}
          <div className="pt-trending" style={{ marginTop: 16 }}>
            <h3 className="pt-trending-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IconTrendUp size={16} style={{ color: "var(--lime)" }} />
              Suggested Traders
            </h3>
            {SUGGESTED_TRADERS.map((trader) => (
              <div key={trader.id} className="pt-suggest-card">
                <Avatar src={trader.avatar} name={trader.name} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{trader.name}</span>
                    {trader.verified && <IconVerified size={12} style={{ color: "var(--lime)" }} />}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--g400)" }}>{trader.handle}</div>
                </div>
                <Button variant="primary" size="sm">
                  Follow
                </Button>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Quote Composer Modal */}
      {quotePostId && (() => {
        const quotedPost = posts.find((p) => p.id === quotePostId);
        if (!quotedPost) return null;
        return (
          <div className="pt-modal-overlay" onClick={() => { setQuotePostId(null); setQuoteContent(""); }}>
            <div className="pt-quote-composer" onClick={(e) => e.stopPropagation()}>
              <div className="pt-composer-top">
                <Avatar
                  src={profile?.avatar_url}
                  name={profile?.display_name ?? "You"}
                  size="md"
                />
                <textarea
                  placeholder="Add your thoughts..."
                  value={quoteContent}
                  onChange={(e) => setQuoteContent(e.target.value)}
                  rows={3}
                  autoFocus
                  dir="auto"
                />
              </div>
              <div className="pt-quoted-embed" style={{ margin: "0 0 16px 0" }}>
                <div className="pt-quoted-embed-header">
                  <Avatar
                    src={quotedPost.author?.avatar_url}
                    name={quotedPost.author?.display_name ?? "User"}
                    size="sm"
                  />
                  <span className="pt-quoted-embed-name">
                    {quotedPost.author?.display_name ?? "Unknown"}
                  </span>
                  {quotedPost.author?.is_verified && (
                    <IconVerified size={12} style={{ color: "var(--lime)" }} />
                  )}
                  <span className="pt-quoted-embed-handle">
                    @{quotedPost.author?.username ?? "user"}
                  </span>
                </div>
                <p className="pt-quoted-embed-body">{quotedPost.content}</p>
              </div>
              <div className="pt-composer-actions" style={{ borderTop: "none", paddingTop: 0 }}>
                <div />
                <Button
                  variant="lime"
                  size="sm"
                  onClick={handleQuoteSubmit}
                  disabled={!quoteContent.trim() || createPost.isPending}
                >
                  {createPost.isPending ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Chart Picker Modal */}
      <ChartPickerWeb
        visible={showChartPicker}
        onClose={() => setShowChartPicker(false)}
        onSelect={handleChartSelect}
      />

      {/* Fullscreen Chart Modal */}
      {fullscreenChartUrl && (
        <div className="pt-modal-overlay" onClick={() => setFullscreenChartUrl(null)}>
          <div className="pt-chart-fullscreen" onClick={(e) => e.stopPropagation()}>
            <button
              className="pt-chart-fullscreen-close"
              onClick={() => setFullscreenChartUrl(null)}
            >
              <IconClose size={20} />
            </button>
            <iframe
              src={fullscreenChartUrl}
              width="100%"
              height="100%"
              style={{ border: "none", borderRadius: 12 }}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      )}

      {/* Fullscreen Image Lightbox */}
      {fullscreenImageUrl && (
        <div className="pt-modal-overlay" onClick={() => setFullscreenImageUrl(null)}>
          <div className="pt-image-lightbox" onClick={(e) => e.stopPropagation()}>
            <button
              className="pt-image-lightbox-close"
              onClick={() => setFullscreenImageUrl(null)}
              aria-label="Close image"
            >
              <IconClose size={20} />
            </button>
            <img
              src={fullscreenImageUrl}
              alt="Full size trading screenshot"
            />
          </div>
        </div>
      )}
    </section>
  );
}
