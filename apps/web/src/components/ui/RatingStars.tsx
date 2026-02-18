"use client";

import { IconStar as Star, IconStarHalf as StarHalf } from "@propian/shared/icons";

interface RatingStarsProps {
  rating: number;
  size?: number;
}

export function RatingStars({ rating, size = 14 }: RatingStarsProps) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <span style={{ display: "inline-flex", gap: 2, color: "var(--lime)" }}>
      {[...Array(full)].map((_, i) => (
        <Star key={i} size={size} />
      ))}
      {half && <StarHalf size={size} />}
      {[...Array(empty)].map((_, i) => (
        <span key={`e${i}`} style={{ opacity: 0.2 }}>
          <Star size={size} />
        </span>
      ))}
    </span>
  );
}
