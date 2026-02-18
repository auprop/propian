"use client";

import { useEffect } from "react";
import { useSearch } from "@propian/shared/hooks";
import { createBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { FilterChip } from "@/components/ui/FilterChip";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

const FILTERS = [
  { label: "All", value: "all" as const },
  { label: "Traders", value: "traders" as const },
  { label: "Firms", value: "firms" as const },
  { label: "Posts", value: "posts" as const },
  { label: "Reviews", value: "reviews" as const },
];

function TraderCard({ trader }: { trader: any }) {
  return (
    <div className="pt-search-user">
      <Avatar
        src={trader.avatar_url}
        name={trader.display_name ?? "Trader"}
        size="md"
      />
      <div className="pt-search-user-info">
        <div className="pt-search-user-name">
          {trader.display_name}
          {trader.is_verified && <Badge variant="lime">Verified</Badge>}
        </div>
        <div className="pt-search-user-handle">@{trader.username}</div>
        {trader.bio && <div className="pt-search-user-bio">{trader.bio}</div>}
      </div>
    </div>
  );
}

function FirmCard({ firm }: { firm: any }) {
  return (
    <div className="pt-search-firm">
      <Avatar
        src={firm.logo_url}
        name={firm.name ?? "Firm"}
        size="md"
      />
      <div className="pt-search-firm-info">
        <div className="pt-search-firm-name">{firm.name}</div>
        {firm.avg_rating != null && (
          <div className="pt-search-firm-rating">
            <span className="pt-star">&#9733;</span> {firm.avg_rating.toFixed(1)}
          </div>
        )}
      </div>
    </div>
  );
}

function PostCard({ post }: { post: any }) {
  return (
    <div className="pt-search-post">
      <div className="pt-search-post-author">
        <Avatar
          src={post.user?.avatar_url}
          name={post.user?.display_name ?? "User"}
          size="sm"
        />
        <span>{post.user?.display_name}</span>
      </div>
      <div className="pt-search-post-body">
        {post.body?.slice(0, 160)}
        {post.body?.length > 160 ? "..." : ""}
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: any }) {
  return (
    <div className="pt-search-review">
      <div className="pt-search-review-header">
        <Avatar
          src={review.user?.avatar_url}
          name={review.user?.display_name ?? "User"}
          size="sm"
        />
        <span>{review.user?.display_name}</span>
        <span className="pt-search-review-rating">
          <span className="pt-star">&#9733;</span> {review.rating}
        </span>
      </div>
      <div className="pt-search-review-body">
        {review.body?.slice(0, 160)}
        {review.body?.length > 160 ? "..." : ""}
      </div>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="pt-col" style={{ gap: 12 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} width="100%" height={72} borderRadius={12} />
      ))}
    </div>
  );
}

export default function SearchPage() {
  const supabase = createBrowserClient();
  const { query, setQuery, filter, setFilter, results } = useSearch(supabase);

  // Keyboard shortcut: Cmd/Ctrl + K focuses the search input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = document.getElementById("search-input");
        input?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const data = results.data;
  const hasResults =
    data &&
    (data.traders?.length ||
      data.firms?.length ||
      data.posts?.length ||
      data.reviews?.length);

  return (
    <div className="pt-container">
      <h1 className="pt-page-title">Search</h1>

      {/* Search bar */}
      <div className="pt-search-bar" style={{ marginBottom: 16 }}>
        <span className="pt-search-icon">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          id="search-input"
          placeholder="Search traders, firms, posts..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <span className="pt-search-kbd">
          <kbd className="pt-kbd">&#8984;K</kbd>
        </span>
      </div>

      {/* Filter chips */}
      <div className="pt-filter-bar">
        {FILTERS.map((f) => (
          <FilterChip
            key={f.value}
            label={f.label}
            active={filter === f.value}
            onClick={() => setFilter(f.value)}
          />
        ))}
      </div>

      {/* Results */}
      {query.length < 2 ? (
        <EmptyState
          title="Type at least 2 characters"
          description="Start typing to search across traders, firms, posts, and reviews."
        />
      ) : results.isLoading ? (
        <ResultsSkeleton />
      ) : !hasResults ? (
        <EmptyState
          title="No results found"
          description={`We couldn't find anything matching "${query}". Try a different search term.`}
        />
      ) : (
        <div className="pt-search-results">
          {/* Traders */}
          {(filter === "all" || filter === "traders") && data.traders?.length > 0 && (
            <div className="pt-search-section">
              {filter === "all" && (
                <h2 className="pt-search-section-title">Traders</h2>
              )}
              {data.traders.map((trader: any) => (
                <TraderCard key={trader.id} trader={trader} />
              ))}
            </div>
          )}

          {/* Firms */}
          {(filter === "all" || filter === "firms") && data.firms?.length > 0 && (
            <div className="pt-search-section">
              {filter === "all" && (
                <h2 className="pt-search-section-title">Firms</h2>
              )}
              {data.firms.map((firm: any) => (
                <FirmCard key={firm.id} firm={firm} />
              ))}
            </div>
          )}

          {/* Posts */}
          {(filter === "all" || filter === "posts") && data.posts?.length > 0 && (
            <div className="pt-search-section">
              {filter === "all" && (
                <h2 className="pt-search-section-title">Posts</h2>
              )}
              {data.posts.map((post: any) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {/* Reviews */}
          {(filter === "all" || filter === "reviews") && data.reviews?.length > 0 && (
            <div className="pt-search-section">
              {filter === "all" && (
                <h2 className="pt-search-section-title">Reviews</h2>
              )}
              {data.reviews.map((review: any) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
