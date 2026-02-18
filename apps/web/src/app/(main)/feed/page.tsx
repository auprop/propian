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
} from "@propian/shared/hooks";
import { createPostSchema } from "@propian/shared/validation";
import type { CreatePostInput } from "@propian/shared/validation";
import type { Post, Comment } from "@propian/shared/types";
import { createBrowserClient } from "@/lib/supabase/client";
import { timeAgo } from "@propian/shared/utils";
import { formatCompact } from "@propian/shared/utils";

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
        <div className="pt-quoted-embed">
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
        </div>
      )}

      {/* Deleted quoted post fallback */}
      {post.type === "quote" && !post.quoted_post && (
        <div className="pt-quoted-embed pt-quoted-embed--deleted">
          <p>This post is unavailable</p>
        </div>
      )}

      {/* Optional chart placeholder */}
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
  const { query } = useComments(supabase, postId);
  const createComment = useCreateComment(supabase);

  const comments: Comment[] = useMemo(
    () => (query.data?.pages?.flatMap((page: unknown) => (Array.isArray(page) ? page : [])) ?? []) as Comment[],
    [query.data],
  );

  const handleSend = () => {
    const content = text.trim();
    if (!content || createComment.isPending) return;
    createComment.mutate(
      { postId, content },
      { onSuccess: () => setText("") },
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
        <p className="pt-comments-empty">No comments yet. Be the first!</p>
      ) : (
        <div className="pt-comments-list">
          {comments.map((comment) => (
            <div key={comment.id} className="pt-comment">
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
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-comment-input">
        <input
          type="text"
          placeholder="Add a comment..."
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

  const onSubmitPost = handleSubmit((data) => {
    createPost.mutate(data, { onSuccess: () => reset() });
  });

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
              />
            </div>

            {errors.content && (
              <p style={{ color: "var(--red)", fontSize: 13, margin: "4px 0 0 52px" }}>
                {errors.content.message}
              </p>
            )}

            <div className="pt-composer-actions">
              <div className="pt-composer-tools">
                <button type="button" className="pt-composer-tool" title="Photo">
                  <IconPhoto size={20} />
                </button>
                <button type="button" className="pt-composer-tool" title="Chart">
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
                disabled={createPost.isPending}
              >
                {createPost.isPending ? "Posting..." : "Post"}
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
    </section>
  );
}
