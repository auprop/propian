"use client";

import { useState } from "react";
import { useLeaderboard } from "@propian/shared/hooks";
import type { LeaderboardEntry, LeaderboardPeriod } from "@propian/shared/types";
import { formatPercent } from "@propian/shared/utils";
import { createBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

const PERIODS: { label: string; value: LeaderboardPeriod }[] = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "All Time", value: "all_time" },
];

const RANK_CLASSES: Record<number, string> = {
  1: "gold",
  2: "silver",
  3: "bronze",
};

function PodiumCard({ entry }: { entry: LeaderboardEntry }) {
  const rankClass = RANK_CLASSES[entry.rank] ?? "";
  return (
    <div className={`pt-leader-card ${rankClass}`}>
      <div className="pt-leader-rank">{entry.rank}</div>
      <Avatar
        src={entry.user?.avatar_url}
        name={entry.user?.display_name ?? "Trader"}
        size="lg"
      />
      <div className="pt-leader-name">
        {entry.user?.display_name ?? "Unknown"}
      </div>
      <div className="pt-leader-handle">@{entry.user?.username ?? "---"}</div>
      <div className="pt-leader-stats">
        <div className="pt-leader-stat">
          <span className="pt-leader-stat-val">{formatPercent(entry.roi)}</span>
          <span className="pt-leader-stat-label">ROI</span>
        </div>
        <div className="pt-leader-stat">
          <span className="pt-leader-stat-val">{entry.win_rate.toFixed(1)}%</span>
          <span className="pt-leader-stat-label">Win Rate</span>
        </div>
        <div className="pt-leader-stat">
          <span className="pt-leader-stat-val">{entry.profit_factor.toFixed(2)}</span>
          <span className="pt-leader-stat-label">PF</span>
        </div>
        <div className="pt-leader-stat">
          <span className="pt-leader-stat-val">{entry.total_trades}</span>
          <span className="pt-leader-stat-label">Trades</span>
        </div>
      </div>
    </div>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className="pt-leader-row">
      <div className="pt-leader-row-rank">{entry.rank}</div>
      <Avatar
        src={entry.user?.avatar_url}
        name={entry.user?.display_name ?? "Trader"}
        size="sm"
      />
      <div className="pt-leader-row-name">
        <span>{entry.user?.display_name ?? "Unknown"}</span>
        <span className="pt-leader-row-handle">@{entry.user?.username ?? "---"}</span>
      </div>
      <div className="pt-leader-row-stat">{formatPercent(entry.roi)}</div>
      <div className="pt-leader-row-stat">{entry.win_rate.toFixed(1)}%</div>
      <div className="pt-leader-row-stat">{entry.profit_factor.toFixed(2)}</div>
      <div className="pt-leader-row-stat">{entry.total_trades}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="pt-col" style={{ gap: 12 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} width="100%" height={180} borderRadius={16} />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={`row-${i}`} width="100%" height={56} borderRadius={12} />
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  const supabase = createBrowserClient();
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  const { data: entries, isLoading } = useLeaderboard(supabase, period);

  const top3 = entries?.slice(0, 3) ?? [];
  const rest = entries?.slice(3) ?? [];

  return (
    <div className="pt-container">
      <h1 className="pt-page-title">Leaderboard</h1>

      <div className="pt-period-tabs">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            className={`pt-period-tab ${period === p.value ? "active" : ""}`}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : !entries?.length ? (
        <EmptyState
          title="No rankings yet"
          description="Check back once traders start posting their results."
        />
      ) : (
        <>
          {/* Top 3 Podium */}
          <div className="pt-leader-podium">
            {top3.map((entry) => (
              <PodiumCard key={entry.user_id} entry={entry} />
            ))}
          </div>

          {/* Remaining entries */}
          {rest.length > 0 && (
            <div className="pt-leader-table">
              <div className="pt-leader-table-header">
                <div className="pt-leader-row-rank">#</div>
                <div style={{ width: 32 }} />
                <div className="pt-leader-row-name">Trader</div>
                <div className="pt-leader-row-stat">ROI</div>
                <div className="pt-leader-row-stat">Win Rate</div>
                <div className="pt-leader-row-stat">PF</div>
                <div className="pt-leader-row-stat">Trades</div>
              </div>
              {rest.map((entry) => (
                <LeaderboardRow key={entry.user_id} entry={entry} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
