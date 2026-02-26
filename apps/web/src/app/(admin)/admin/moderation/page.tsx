"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  useAdminReports,
  useAdminResolveReport,
  useAdminDeletePost,
  useAdminDeleteComment,
  useAdminModRules,
  useAdminToggleModRule,
  useAdminModActions,
} from "@propian/shared/hooks";

export default function AdminModeration() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [tab, setTab] = useState<"Reports" | "Auto Rules" | "History">("Reports");
  const [reportStatus, setReportStatus] = useState("pending");
  const { data: reports } = useAdminReports(supabase, reportStatus);
  const resolveReport = useAdminResolveReport(supabase);
  const deletePost = useAdminDeletePost(supabase);
  const deleteComment = useAdminDeleteComment(supabase);
  const { data: modRules } = useAdminModRules(supabase);
  const toggleRule = useAdminToggleModRule(supabase);
  const { data: modActions } = useAdminModActions(supabase);

  return (
    <div>
      <div className="pt-admin-section-header">
        <div>
          <div className="pt-admin-section-tag">ADMIN PANEL</div>
          <h2 className="pt-admin-section-title">Post Moderation</h2>
          <p className="pt-admin-section-subtitle">Reports, auto-moderation rules, and action history</p>
        </div>
      </div>

      {/* Stats */}
      <div className="pt-admin-stats">
        {[
          { label: "Pending Reports", value: reports?.filter((r) => r.status === "pending").length.toString() ?? "—" },
          { label: "Resolved Today", value: modActions?.filter((a) => {
            const today = new Date().toISOString().split("T")[0];
            return a.created_at?.startsWith(today);
          }).length.toString() ?? "—" },
          { label: "Active Rules", value: modRules?.filter((r) => r.is_active).length.toString() ?? "—" },
          { label: "Total Actions", value: modActions?.length.toString() ?? "—" },
        ].map((s) => (
          <div key={s.label} className="pt-admin-stat">
            <div className="pt-admin-stat-label">{s.label}</div>
            <div className="pt-admin-stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="pt-admin-tabs">
        {(["Reports", "Auto Rules", "History"] as const).map((t) => (
          <button key={t} className={`pt-admin-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* Reports tab */}
      {tab === "Reports" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["pending", "resolved", "dismissed"].map((s) => (
              <button
                key={s}
                className={`pt-admin-btn ${reportStatus === s ? "primary" : "ghost"}`}
                style={{ padding: "6px 14px", fontSize: 12 }}
                onClick={() => setReportStatus(s)}
              >
                <span>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
              </button>
            ))}
          </div>

          {reports?.length === 0 && (
            <div className="pt-admin-card" style={{ padding: 28, textAlign: "center", color: "var(--g400)" }}>
              No {reportStatus} reports
            </div>
          )}

          {reports?.map((r) => (
            <div key={r.id} className="pt-admin-report">
              <div className="pt-admin-report-header">
                <div>
                  <span style={{ fontWeight: 700 }}>
                    {r.reporter?.display_name || r.reporter?.username || "Unknown"}
                  </span>
                  <span style={{ color: "var(--g400)", fontSize: 12 }}> reported {r.post_id ? "post" : "comment"}</span>
                </div>
                <span className={`pt-admin-badge ${r.status === "pending" ? "amber" : r.status === "resolved" ? "green" : "outline"}`}>
                  {r.status}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--g300)", marginTop: 8 }}>
                <strong>Reason:</strong> {r.reason}
              </div>
              {r.post && (
                <div className="pt-admin-card" style={{ padding: 12, marginTop: 10 }}>
                  <div style={{ fontSize: 12, color: "var(--g400)", marginBottom: 4 }}>
                    Post by @{r.post.profiles?.username}
                  </div>
                  <div style={{ fontSize: 13 }}>{r.post.content?.slice(0, 200)}</div>
                </div>
              )}
              {r.comment && (
                <div className="pt-admin-card" style={{ padding: 12, marginTop: 10 }}>
                  <div style={{ fontSize: 12, color: "var(--g400)", marginBottom: 4 }}>
                    Comment by @{r.comment.profiles?.username}
                  </div>
                  <div style={{ fontSize: 13 }}>{r.comment.content?.slice(0, 200)}</div>
                </div>
              )}
              {r.status === "pending" && (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    className="pt-admin-btn lime"
                    style={{ padding: "6px 6px 6px 12px", fontSize: 12 }}
                    onClick={() => resolveReport.mutate({ reportId: r.id, action: "resolved" })}
                  >
                    <span>Resolve</span>
                  </button>
                  <button
                    className="pt-admin-btn ghost"
                    style={{ padding: "6px 6px 6px 12px", fontSize: 12 }}
                    onClick={() => resolveReport.mutate({ reportId: r.id, action: "dismissed" })}
                  >
                    <span>Dismiss</span>
                  </button>
                  {r.post && (
                    <button
                      className="pt-admin-btn red"
                      style={{ padding: "6px 6px 6px 12px", fontSize: 12 }}
                      onClick={() => {
                        deletePost.mutate({ postId: r.post!.id, reason: "Report: " + r.reason });
                        resolveReport.mutate({ reportId: r.id, action: "resolved" });
                      }}
                    >
                      <span>Delete Post</span>
                    </button>
                  )}
                  {r.comment && (
                    <button
                      className="pt-admin-btn red"
                      style={{ padding: "6px 6px 6px 12px", fontSize: 12 }}
                      onClick={() => {
                        deleteComment.mutate({ commentId: r.comment!.id, reason: "Report: " + r.reason });
                        resolveReport.mutate({ reportId: r.id, action: "resolved" });
                      }}
                    >
                      <span>Delete Comment</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Auto Rules tab */}
      {tab === "Auto Rules" && (
        <div>
          {modRules?.map((rule) => (
            <div key={rule.id} className="pt-admin-card" style={{ padding: 18, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{rule.name}</div>
                <div style={{ fontSize: 12, color: "var(--g400)", marginTop: 2 }}>
                  Action: <span className="pt-admin-mono">{rule.action}</span> &middot; Pattern: <span className="pt-admin-mono">{rule.pattern}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--g400)", marginTop: 2 }}>
                  Matches: <span className="pt-admin-mono" style={{ fontWeight: 700 }}>{rule.matches_count}</span>
                </div>
              </div>
              <button
                className={`pt-admin-toggle ${rule.is_active ? "active" : ""}`}
                onClick={() => toggleRule.mutate({ ruleId: rule.id, active: !rule.is_active })}
              >
                <span className="pt-admin-toggle-thumb" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* History tab */}
      {tab === "History" && (
        <div className="pt-admin-table">
          <div className="pt-admin-table-header" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 2fr" }}>
            {["Admin", "Action", "Target", "Date", "Reason"].map((h) => (
              <div key={h} className="pt-admin-table-header-cell">{h}</div>
            ))}
          </div>
          {modActions?.map((a) => (
            <div key={a.id} className="pt-admin-table-row" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 2fr" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{a.admin?.display_name || a.admin?.username || "System"}</span>
              <span className={`pt-admin-badge ${
                a.action.includes("ban") ? "red" : a.action.includes("delete") ? "red" : a.action.includes("resolve") ? "green" : "outline"
              }`}>
                {a.action}
              </span>
              <span className="pt-admin-mono" style={{ fontSize: 11 }}>
                {a.target_type}:{a.target_id?.slice(0, 8)}
              </span>
              <span style={{ fontSize: 12, color: "var(--g400)" }}>
                {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
              </span>
              <span style={{ fontSize: 12, color: "var(--g400)" }}>{a.reason || "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
