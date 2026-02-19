"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useFirms } from "@propian/shared/hooks";
import { firmCategories, type FirmCategory } from "@propian/shared/constants";
import type { Firm, FirmFilter } from "@propian/shared/types";
import { IconSearch, IconVerifiedFirm } from "@propian/shared/icons";
import { createBrowserClient } from "@/lib/supabase/client";
import { FilterChip } from "@/components/ui/FilterChip";
import { RatingStars } from "@/components/ui/RatingStars";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";

export default function FirmsPage() {
  const supabase = createBrowserClient();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<FirmCategory>("All Firms");

  const filter = useMemo<FirmFilter>(() => {
    const f: FirmFilter = {};
    if (search.trim()) f.search = search.trim();
    switch (activeCategory) {
      case "Forex":
      case "Futures":
      case "Crypto":
        f.category = activeCategory.toLowerCase();
        break;
      case "High Rating":
        f.sort = "rating";
        f.minRating = 4;
        break;
      case "Lowest Fee":
        f.sort = "fee";
        break;
      case "Best Payout":
        f.sort = "popularity";
        break;
    }
    return f;
  }, [search, activeCategory]);

  const { data: firms, isLoading } = useFirms(supabase, filter);

  return (
    <div className="pt-container">
      {/* Search Bar */}
      <div className="pt-search-bar" style={{ marginBottom: 16 }}>
        <span className="pt-search-icon">
          <IconSearch size={18} />
        </span>
        <input
          type="text"
          placeholder="Search prop firms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filter Chips */}
      <div className="pt-filter-bar">
        {firmCategories.map((cat) => (
          <FilterChip
            key={cat}
            label={cat}
            active={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
          />
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="pt-g3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="pt-firm-card">
              <Skeleton width={56} height={56} borderRadius="50%" />
              <Skeleton width="60%" height={18} />
              <Skeleton width="80%" height={14} />
              <Skeleton width="100%" height={14} />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!firms || firms.length === 0) && (
        <EmptyState
          title="No firms found"
          description="Try adjusting your search or filters to find prop firms."
        />
      )}

      {/* Firm Cards Grid */}
      {!isLoading && firms && firms.length > 0 && (
        <div className="pt-g3">
          {firms.map((firm: Firm) => (
            <Link
              key={firm.id}
              href={`/firms/${firm.slug}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="pt-firm-card">
                {/* Logo */}
                <div className="pt-firm-logo">
                  {firm.logo_url ? (
                    <img src={firm.logo_url} alt={firm.name} />
                  ) : (
                    <span>{firm.name.charAt(0)}</span>
                  )}
                </div>

                {/* Name + Verified */}
                <div className="pt-firm-name">
                  {firm.name}
                  {firm.is_active && (
                    <IconVerifiedFirm size={16} style={{ marginLeft: 4 }} />
                  )}
                </div>

                {/* Rating Row */}
                <div className="pt-firm-rating">
                  <span style={{ fontWeight: 700 }}>{firm.rating_avg.toFixed(1)}</span>
                  <RatingStars rating={firm.rating_avg} size={14} />
                  <span style={{ opacity: 0.6, fontSize: 13 }}>({firm.review_count})</span>
                </div>

                {/* Stats Row */}
                <div className="pt-firm-stats">
                  {firm.pass_rate && (
                    <div className="pt-firm-stat">
                      <span style={{ opacity: 0.5, fontSize: 11 }}>Pass Rate</span>
                      <span style={{ fontWeight: 600 }}>{firm.pass_rate}</span>
                    </div>
                  )}
                  {firm.total_payouts && (
                    <div className="pt-firm-stat">
                      <span style={{ opacity: 0.5, fontSize: 11 }}>Payouts</span>
                      <span style={{ fontWeight: 600 }}>{firm.total_payouts}</span>
                    </div>
                  )}
                  {firm.challenge_fee_min !== null && (
                    <div className="pt-firm-stat">
                      <span style={{ opacity: 0.5, fontSize: 11 }}>Fee from</span>
                      <span style={{ fontWeight: 600 }}>${firm.challenge_fee_min}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
