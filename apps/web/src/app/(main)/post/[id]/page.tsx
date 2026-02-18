"use client";

import { useMemo, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  IconHeart,
  IconHeartOutline,
  IconComment,
  IconRepost,
  IconShare,
  IconBookmark,
  IconEye,
  IconVerified,
  IconQuote,
  IconReply,
} from "@propian/shared/icons";
import {
  usePost,
  useLikePost,
  useBookmark,
  useRepost,
  useComments,
  useCreateComment,
  useCreatePost,
  useLikeComment,
  useBookmarkComment,
} from "@propian/shared/hooks";
import type { Post, Comment } from "@propian/shared/types";
import { createBrowserClient } from "@/lib/supabase/client";
import { timeAgo } from "@propian/shared/utils";
import { formatCompact } from "@propian/shared/utils";

/* ------------------------------------------------------------------ */
/*  Post Detail Page                                                   */
/* ------------------------------------------------------------------ */

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);

  const { data: post, isLoading, isError } = usePost(supabase, params.id);

  /* Mutations */
  const likePost = useLikePost(supabase);
  const bookmarkPost = useBookmark(supabase);
  const repostPost = useRepost(supabase);
  const createPost = useCreatePost(supabase);

  /* State */
  const [repostMenuOpen, setRepostMenuOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteContent, setQuoteContent] = useState("");

  /* Handlers */
  const handleLike = useCallback(() => {
    if (!post) return;
    likePost.mutate({ postId: post.id, action: post.is_liked ? "unlike" : "like" });
  }, [post, likePost]);

  const handleBookmark = useCallback(() => {
    if (!post) return;
    bookmarkPost.mutate({ postId: post.id, action: post.is_bookmarked ? "unbookmark" : "bookmark" });
  }, [post, bookmarkPost]);

  const handleRepost = useCallback(() => {
    if (!post) return;
    repostPost.mutate({ postId: post.id, action: post.is_reposted ? "unrepost" : "repost" });
    setRepostMenuOpen(false);
  }, [post, repostPost]);

  const handleShare = useCallback(async () => {
    if (!post) return;
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2000);
      }
    } catch (_) {}
  }, [post]);

  const handleQuoteSubmit = useCallback(() => {
    if (!quoteContent.trim() || !post) return;
    createPost.mutate(
      { content: quoteContent.trim(), type: "quote", quoted_post_id: post.id },
      {
        onSuccess: () => {
          setQuoteContent("");
          setQuoteOpen(false);
        },
      },
    );
  }, [quoteContent, post, createPost]);

  /* ---------------------------------------------------------------- */
  /*  Loading / Error                                                  */
  /* ---------------------------------------------------------------- */

  if (isLoading) {
    return (
      <section className="pt-section">
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <button
            className="pt-back-link"
            onClick={() => router.back()}
          >
            &larr; Back
          </button>
          <div className="pt-post">
            <div className="pt-post-header">
              <Skeleton width={48} height={48} borderRadius="50%" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Skeleton width={160} height={14} borderRadius={4} />
                <Skeleton width={120} height={12} borderRadius={4} />
              </div>
            </div>
            <div className="pt-post-body">
              <Skeleton width="100%" height={14} borderRadius={4} />
              <Skeleton width="90%" height={14} borderRadius={4} />
              <Skeleton width="70%" height={14} borderRadius={4} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isError || !post) {
    return (
      <section className="pt-section">
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <button
            className="pt-back-link"
            onClick={() => router.back()}
          >
            &larr; Back
          </button>
          <EmptyState
            title="Post not found"
            description="This post may have been deleted or doesn't exist."
          />
        </div>
      </section>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const author = post.author;

  return (
    <section className="pt-section">
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <button
          className="pt-back-link"
          onClick={() => router.back()}
        >
          &larr; Back
        </button>

        <article className="pt-post pt-post-detail" style={{ position: "relative" }}>
          {/* Header */}
          <div className="pt-post-header">
            <Avatar
              src={author?.avatar_url}
              name={author?.display_name ?? "User"}
              size="lg"
            />
            <div className="pt-post-author">
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{author?.display_name ?? "User"}</span>
                {author?.is_verified && (
                  <IconVerified size={16} style={{ color: "var(--lime)" }} />
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="pt-post-handle">@{author?.username ?? "user"}</span>
                <span className="pt-post-time">{timeAgo(post.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Body — larger text for detail view */}
          {post.content && (
            <div className="pt-post-body" style={{ fontSize: 16, lineHeight: 1.7 }}>
              {post.content}
            </div>
          )}

          {/* Quoted post embed */}
          {(post.type === "quote" || post.type === "repost") && post.quoted_post && (
            <a href={`/post/${post.quoted_post.id}`} className="pt-quoted-embed pt-quoted-embed--clickable">
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
              <p className="pt-quoted-embed-body">{post.quoted_post.content}</p>
            </a>
          )}

          {/* Deleted quoted post fallback */}
          {(post.type === "quote" || post.type === "repost") && !post.quoted_post && post.quoted_post_id && (
            <div className="pt-quoted-embed pt-quoted-embed--deleted">
              <p>This post is unavailable</p>
            </div>
          )}

          {/* Image */}
          {post.type === "image" && post.media_urls.length > 0 && (
            <div className="pt-post-chart">
              <img
                src={post.media_urls[0]}
                alt="Trade chart"
                style={{ width: "100%", borderRadius: 8 }}
              />
            </div>
          )}

          {/* Actions bar */}
          <div className="pt-post-actions">
            <button className="pt-post-action" onClick={() => {}}>
              <IconComment size={16} />
              <span>{post.comment_count > 0 ? formatCompact(post.comment_count) : ""}</span>
            </button>

            {/* Repost with dropdown */}
            <div style={{ position: "relative", flex: 1, display: "flex", justifyContent: "center" }}>
              <button
                className={`pt-post-action ${post.is_reposted ? "reposted" : ""}`}
                onClick={() => setRepostMenuOpen((prev) => !prev)}
              >
                <IconRepost size={20} style={post.is_reposted ? { color: "var(--green)" } : undefined} />
                <span>{post.repost_count > 0 ? formatCompact(post.repost_count) : ""}</span>
              </button>
              {repostMenuOpen && (
                <div className="pt-repost-menu">
                  <button onClick={handleRepost}>
                    <IconRepost size={16} style={post.is_reposted ? { color: "var(--green)" } : undefined} />
                    {post.is_reposted ? "Undo Repost" : "Repost"}
                  </button>
                  <button onClick={() => { setQuoteOpen(true); setRepostMenuOpen(false); }}>
                    <IconQuote size={16} />
                    Quote
                  </button>
                </div>
              )}
            </div>

            <button
              className={`pt-post-action ${post.is_liked ? "liked" : ""}`}
              onClick={handleLike}
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
              onClick={handleBookmark}
            >
              <IconBookmark size={17} style={post.is_bookmarked ? { color: "var(--lime)" } : undefined} />
            </button>

            <button className="pt-post-action" onClick={handleShare}>
              <IconShare size={19} />
            </button>
          </div>

          {/* Copied toast */}
          {copiedToast && (
            <div className="pt-copied-toast">Link copied!</div>
          )}

          {/* Comments section — always visible on detail page */}
          <InlineComments postId={post.id} supabase={supabase} />
        </article>
      </div>

      {/* Quote Composer Modal */}
      {quoteOpen && post && (
        <div className="pt-modal-overlay" onClick={() => { setQuoteOpen(false); setQuoteContent(""); }}>
          <div className="pt-quote-composer" onClick={(e) => e.stopPropagation()}>
            <div className="pt-composer-top">
              <textarea
                placeholder="Add your thoughts..."
                value={quoteContent}
                onChange={(e) => setQuoteContent(e.target.value)}
                rows={3}
                autoFocus
              />
            </div>
            <div className="pt-quoted-embed" style={{ margin: "0 0 16px 0" }}>
              <div className="pt-quoted-embed-header">
                <Avatar
                  src={post.author?.avatar_url}
                  name={post.author?.display_name ?? "User"}
                  size="sm"
                />
                <span className="pt-quoted-embed-name">
                  {post.author?.display_name ?? "Unknown"}
                </span>
                {post.author?.is_verified && (
                  <IconVerified size={12} style={{ color: "var(--lime)" }} />
                )}
                <span className="pt-quoted-embed-handle">
                  @{post.author?.username ?? "user"}
                </span>
              </div>
              <p className="pt-quoted-embed-body">{post.content}</p>
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
      )}
    </section>
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
