"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  useAdminUsers,
  useAdminBanUser,
  useAdminUnbanUser,
  useAdminShadowbanUser,
  useAdminUnshadowbanUser,
  useAdminSetVerified,
  useAdminSetAdmin,
  useAdminDeleteUser,
} from "@propian/shared/hooks";

type ModalType = null | "ban" | "delete";

export default function AdminUsers() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const { data: users, isLoading } = useAdminUsers(supabase, search || undefined);

  // Mutations
  const banUser = useAdminBanUser(supabase);
  const unbanUser = useAdminUnbanUser(supabase);
  const shadowbanUser = useAdminShadowbanUser(supabase);
  const unshadowbanUser = useAdminUnshadowbanUser(supabase);
  const setVerified = useAdminSetVerified(supabase);
  const setAdmin = useAdminSetAdmin(supabase);
  const deleteUser = useAdminDeleteUser(supabase);

  // Modal state
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalUserId, setModalUserId] = useState<string | null>(null);
  const [modalReason, setModalReason] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const modalUser = users?.find((u) => u.id === modalUserId);

  const openModal = (type: ModalType, userId: string) => {
    setModalType(type);
    setModalUserId(userId);
    setModalReason("");
    setConfirmText("");
  };

  const closeModal = () => {
    setModalType(null);
    setModalUserId(null);
    setModalReason("");
    setConfirmText("");
  };

  const handleBan = () => {
    if (modalUserId && modalReason) {
      banUser.mutate({ userId: modalUserId, reason: modalReason });
      closeModal();
    }
  };

  const handleDelete = () => {
    if (modalUserId && confirmText === "DELETE") {
      deleteUser.mutate({ userId: modalUserId, reason: modalReason || undefined });
      closeModal();
      setExpandedUser(null);
    }
  };

  // Stats
  const totalUsers = users?.length ?? 0;
  const verifiedCount = users?.filter((u) => u.is_verified).length ?? 0;
  const bannedCount = users?.filter((u) => u.banned_at).length ?? 0;
  const shadowCount = users?.filter((u) => u.shadowbanned).length ?? 0;
  const adminCount = users?.filter((u) => u.is_admin).length ?? 0;
  const proCount = users?.filter((u) => u.pro_subscription_status === "active" || u.pro_subscription_status === "trialing").length ?? 0;

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getRole = (u: { is_admin?: boolean; is_verified?: boolean }) => {
    if (u.is_admin) return { label: "Admin", cls: "dark" };
    if (u.is_verified) return { label: "Verified", cls: "blue" };
    return { label: "User", cls: "outline" };
  };

  const getStatus = (u: { banned_at?: string | null; shadowbanned?: boolean }) => {
    if (u.banned_at) return { label: "Banned", cls: "red", dot: "var(--red)" };
    if (u.shadowbanned) return { label: "Shadowbanned", cls: "amber", dot: "var(--amber)" };
    return { label: "Active", cls: "green", dot: "var(--green)" };
  };

  return (
    <div>
      <div className="pt-admin-section-header">
        <div>
          <div className="pt-admin-section-tag">ADMIN PANEL</div>
          <h2 className="pt-admin-section-title">User Management</h2>
          <p className="pt-admin-section-subtitle">Search, view, verify, ban, shadowban, promote, and delete user accounts</p>
        </div>
      </div>

      {/* Stats */}
      <div className="pt-admin-stats">
        {[
          { label: "Total Users", value: totalUsers ? `${totalUsers}+` : "—" },
          { label: "Verified", value: verifiedCount.toString() },
          { label: "Pro Members", value: proCount.toString() },
          { label: "Admins", value: adminCount.toString() },
          { label: "Banned", value: bannedCount.toString() },
          { label: "Shadowbanned", value: shadowCount.toString() },
        ].map((s) => (
          <div key={s.label} className="pt-admin-stat">
            <div className="pt-admin-stat-label">{s.label}</div>
            <div className="pt-admin-stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          className="pt-admin-search"
          placeholder="Search by username or display name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="pt-admin-card" style={{ padding: 28, textAlign: "center", color: "var(--g400)" }}>
          Loading users...
        </div>
      )}

      {/* User table */}
      {!isLoading && (
        <div className="pt-admin-table">
          <div className="pt-admin-table-header" style={{ gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr 1fr 1fr 60px" }}>
            {["User", "Joined", "Posts", "Role", "Pro", "Status", "Verified", ""].map((h, i) => (
              <div key={i} className="pt-admin-table-header-cell">{h}</div>
            ))}
          </div>
          {users?.length === 0 && (
            <div style={{ padding: 28, textAlign: "center", color: "var(--g400)" }}>
              No users found
            </div>
          )}
          {users?.map((u) => {
            const role = getRole(u);
            const status = getStatus(u);
            const isExpanded = expandedUser === u.id;

            return (
              <div key={u.id}>
                {/* Main row */}
                <div
                  className="pt-admin-table-row"
                  style={{ gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr 1fr 1fr 60px", cursor: "pointer" }}
                  onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                >
                  {/* Avatar + name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 34, height: 34, borderRadius: "50%",
                        background: "var(--g700)", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, color: "var(--g300)", overflow: "hidden", flexShrink: 0,
                      }}
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        (u.username?.[0] ?? "?").toUpperCase()
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.display_name || u.username}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--g400)" }}>@{u.username}</div>
                    </div>
                  </div>

                  {/* Joined */}
                  <span style={{ fontSize: 12, color: "var(--g400)" }}>{formatDate(u.created_at)}</span>

                  {/* Posts */}
                  <span className="pt-admin-mono" style={{ fontWeight: 700 }}>{u.post_count ?? 0}</span>

                  {/* Role */}
                  <span className={`pt-admin-badge ${role.cls}`}>{role.label}</span>

                  {/* Pro */}
                  {u.pro_subscription_status === "active" || u.pro_subscription_status === "trialing" ? (
                    <span className="pt-admin-badge lime" style={{ background: "#c8ff00", color: "#0a0a0a", fontWeight: 800, fontSize: 10, letterSpacing: 0.5 }}>PRO</span>
                  ) : u.pro_subscription_status === "past_due" ? (
                    <span className="pt-admin-badge amber">Past Due</span>
                  ) : u.pro_subscription_status === "canceled" ? (
                    <span className="pt-admin-badge red">Cancelled</span>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--g500)" }}>—</span>
                  )}

                  {/* Status */}
                  <span className={`pt-admin-badge ${status.cls}`}>
                    <span className="pt-admin-dot" style={{ background: status.dot }} /> {status.label}
                  </span>

                  {/* Verified toggle */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <button
                      className={`pt-admin-toggle ${u.is_verified ? "active" : ""}`}
                      onClick={() => setVerified.mutate({ userId: u.id, verified: !u.is_verified })}
                    >
                      <span className="pt-admin-toggle-thumb" />
                    </button>
                  </div>

                  {/* Expand arrow */}
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={16} height={16}
                      style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "var(--g400)" }}
                    >
                      <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                    </svg>
                  </div>
                </div>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="pt-admin-user-detail">
                    <div className="pt-admin-user-detail-grid">
                      {/* Left: Profile info */}
                      <div className="pt-admin-card" style={{ padding: 20 }}>
                        <div className="pt-admin-card-label">Profile Details</div>
                        <div className="pt-admin-detail-rows">
                          <div className="pt-admin-detail-row">
                            <span className="pt-admin-detail-key">User ID</span>
                            <span className="pt-admin-mono" style={{ fontSize: 11 }}>{u.id}</span>
                          </div>
                          <div className="pt-admin-detail-row">
                            <span className="pt-admin-detail-key">Username</span>
                            <span>@{u.username}</span>
                          </div>
                          <div className="pt-admin-detail-row">
                            <span className="pt-admin-detail-key">Display Name</span>
                            <span>{u.display_name || "—"}</span>
                          </div>
                          <div className="pt-admin-detail-row">
                            <span className="pt-admin-detail-key">Bio</span>
                            <span style={{ fontSize: 12, color: "var(--g400)" }}>{u.bio || "No bio set"}</span>
                          </div>
                          <div className="pt-admin-detail-row">
                            <span className="pt-admin-detail-key">Trading Style</span>
                            <span>{u.trading_style || "—"}</span>
                          </div>
                          <div className="pt-admin-detail-row">
                            <span className="pt-admin-detail-key">Experience</span>
                            <span>{u.experience_level || "—"}</span>
                          </div>
                          <div className="pt-admin-detail-row">
                            <span className="pt-admin-detail-key">Location</span>
                            <span>{u.location || "—"}</span>
                          </div>
                          <div className="pt-admin-detail-row">
                            <span className="pt-admin-detail-key">Website</span>
                            <span>{u.website || "—"}</span>
                          </div>
                          <div className="pt-admin-detail-row">
                            <span className="pt-admin-detail-key">Joined</span>
                            <span>{formatDate(u.created_at)}</span>
                          </div>
                          <div className="pt-admin-detail-row">
                            <span className="pt-admin-detail-key">Pro Status</span>
                            <span>
                              {u.pro_subscription_status === "active" || u.pro_subscription_status === "trialing" ? (
                                <span style={{ background: "#c8ff00", color: "#0a0a0a", fontWeight: 800, fontSize: 10, padding: "2px 6px", borderRadius: 4, letterSpacing: 0.5 }}>
                                  {u.pro_subscription_status === "trialing" ? "TRIALING" : "PRO ACTIVE"}
                                </span>
                              ) : u.pro_subscription_status === "past_due" ? (
                                <span style={{ color: "var(--amber)", fontWeight: 600, fontSize: 12 }}>Past Due</span>
                              ) : u.pro_subscription_status === "canceled" ? (
                                <span style={{ color: "var(--red)", fontWeight: 600, fontSize: 12 }}>Cancelled</span>
                              ) : (
                                <span style={{ color: "var(--g400)" }}>Not subscribed</span>
                              )}
                            </span>
                          </div>
                          {u.pro_subscription_id && (
                            <div className="pt-admin-detail-row">
                              <span className="pt-admin-detail-key">Subscription ID</span>
                              <span className="pt-admin-mono" style={{ fontSize: 11 }}>{u.pro_subscription_id}</span>
                            </div>
                          )}
                          {u.pro_expires_at && (
                            <div className="pt-admin-detail-row">
                              <span className="pt-admin-detail-key">Pro Expires</span>
                              <span>{formatDate(u.pro_expires_at)}</span>
                            </div>
                          )}
                          {u.stripe_customer_id && (
                            <div className="pt-admin-detail-row">
                              <span className="pt-admin-detail-key">Stripe Customer</span>
                              <span className="pt-admin-mono" style={{ fontSize: 11 }}>{u.stripe_customer_id}</span>
                            </div>
                          )}
                          {u.banned_at && (
                            <>
                              <div className="pt-admin-detail-row">
                                <span className="pt-admin-detail-key">Banned At</span>
                                <span style={{ color: "var(--red)" }}>{formatDate(u.banned_at)}</span>
                              </div>
                              <div className="pt-admin-detail-row">
                                <span className="pt-admin-detail-key">Ban Reason</span>
                                <span style={{ color: "var(--red)", fontSize: 12 }}>{u.ban_reason || "—"}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Stats + Actions */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {/* Stats card */}
                        <div className="pt-admin-card" style={{ padding: 20 }}>
                          <div className="pt-admin-card-label">Engagement</div>
                          <div className="pt-admin-user-stat-grid">
                            <div className="pt-admin-user-stat-item">
                              <div className="pt-admin-mono" style={{ fontSize: 22, fontWeight: 800 }}>{u.post_count ?? 0}</div>
                              <div style={{ fontSize: 11, color: "var(--g400)" }}>Posts</div>
                            </div>
                            <div className="pt-admin-user-stat-item">
                              <div className="pt-admin-mono" style={{ fontSize: 22, fontWeight: 800 }}>{u.follower_count ?? 0}</div>
                              <div style={{ fontSize: 11, color: "var(--g400)" }}>Followers</div>
                            </div>
                            <div className="pt-admin-user-stat-item">
                              <div className="pt-admin-mono" style={{ fontSize: 22, fontWeight: 800 }}>{u.following_count ?? 0}</div>
                              <div style={{ fontSize: 11, color: "var(--g400)" }}>Following</div>
                            </div>
                          </div>
                        </div>

                        {/* Actions card */}
                        <div className="pt-admin-card" style={{ padding: 20 }}>
                          <div className="pt-admin-card-label">Actions</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                            {/* View Profile */}
                            <a
                              href={`/profile/${u.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="pt-admin-btn"
                              style={{ padding: "8px 8px 8px 14px", fontSize: 13, textDecoration: "none", display: "inline-flex", width: "fit-content" }}
                            >
                              <span>View Profile</span>
                              <span className="pt-admin-btn-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={13} height={13}><path fill="currentColor" d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                              </span>
                            </a>

                            {/* Verify / Unverify */}
                            <button
                              className={`pt-admin-btn ${u.is_verified ? "amber" : "blue"}`}
                              style={{ padding: "8px 8px 8px 14px", fontSize: 13, width: "fit-content" }}
                              onClick={() => setVerified.mutate({ userId: u.id, verified: !u.is_verified })}
                            >
                              <span>{u.is_verified ? "Remove Verification" : "Verify User"}</span>
                              <span className="pt-admin-btn-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={13} height={13}><path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
                              </span>
                            </button>

                            {/* Admin toggle */}
                            <button
                              className={`pt-admin-btn ${u.is_admin ? "amber" : "lime"}`}
                              style={{ padding: "8px 8px 8px 14px", fontSize: 13, width: "fit-content" }}
                              onClick={() => setAdmin.mutate({ userId: u.id, isAdmin: !u.is_admin })}
                            >
                              <span>{u.is_admin ? "Revoke Admin" : "Grant Admin"}</span>
                              <span className="pt-admin-btn-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={13} height={13}><path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
                              </span>
                            </button>

                            {/* Ban / Unban */}
                            {u.banned_at ? (
                              <button
                                className="pt-admin-btn lime"
                                style={{ padding: "8px 8px 8px 14px", fontSize: 13, width: "fit-content" }}
                                onClick={() => unbanUser.mutate(u.id)}
                              >
                                <span>Unban User</span>
                                <span className="pt-admin-btn-icon">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={13} height={13}><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-7v4h4l-5 7z"/></svg>
                                </span>
                              </button>
                            ) : (
                              <button
                                className="pt-admin-btn red"
                                style={{ padding: "8px 8px 8px 14px", fontSize: 13, width: "fit-content" }}
                                onClick={() => openModal("ban", u.id)}
                              >
                                <span>Ban User</span>
                                <span className="pt-admin-btn-icon">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={13} height={13}><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/></svg>
                                </span>
                              </button>
                            )}

                            {/* Shadowban / Unshadowban */}
                            {u.shadowbanned ? (
                              <button
                                className="pt-admin-btn"
                                style={{ padding: "8px 8px 8px 14px", fontSize: 13, width: "fit-content" }}
                                onClick={() => unshadowbanUser.mutate(u.id)}
                              >
                                <span>Remove Shadowban</span>
                              </button>
                            ) : !u.banned_at ? (
                              <button
                                className="pt-admin-btn amber"
                                style={{ padding: "8px 8px 8px 14px", fontSize: 13, width: "fit-content" }}
                                onClick={() => shadowbanUser.mutate(u.id)}
                              >
                                <span>Shadowban User</span>
                              </button>
                            ) : null}

                            {/* Delete — danger zone */}
                            <div style={{ borderTop: "1px solid var(--brd)", paddingTop: 10, marginTop: 4 }}>
                              <button
                                className="pt-admin-btn red"
                                style={{ padding: "8px 8px 8px 14px", fontSize: 13, width: "fit-content" }}
                                onClick={() => openModal("delete", u.id)}
                              >
                                <span>Delete User</span>
                                <span className="pt-admin-btn-icon">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={13} height={13}><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Ban modal */}
      {modalType === "ban" && modalUser && (
        <div className="pt-admin-overlay" onClick={closeModal}>
          <div className="pt-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Ban User</div>
            <div style={{ fontSize: 13, color: "var(--g400)", marginBottom: 16 }}>
              Banning <strong>@{modalUser.username}</strong> will restrict their access to the platform.
            </div>
            <label className="pt-admin-label">Reason (required)</label>
            <textarea
              className="pt-admin-textarea"
              placeholder="Enter ban reason..."
              value={modalReason}
              onChange={(e) => setModalReason(e.target.value)}
              style={{ minHeight: 100 }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="pt-admin-btn red" onClick={handleBan} style={{ opacity: modalReason ? 1 : 0.5 }}>
                <span>Confirm Ban</span>
              </button>
              <button className="pt-admin-btn ghost" onClick={closeModal}>
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {modalType === "delete" && modalUser && (
        <div className="pt-admin-overlay" onClick={closeModal}>
          <div className="pt-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: "var(--red)" }}>Delete User</div>
            <div style={{ fontSize: 13, color: "var(--g400)", marginBottom: 8 }}>
              This will <strong>permanently delete</strong> <strong>@{modalUser.username}</strong> and all their content (posts, comments, reviews). This cannot be undone.
            </div>
            <label className="pt-admin-label">Reason (optional)</label>
            <textarea
              className="pt-admin-textarea"
              placeholder="Enter deletion reason..."
              value={modalReason}
              onChange={(e) => setModalReason(e.target.value)}
              style={{ minHeight: 80 }}
            />
            <label className="pt-admin-label" style={{ marginTop: 12 }}>Type DELETE to confirm</label>
            <input
              className="pt-admin-input"
              placeholder="DELETE"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                className="pt-admin-btn red"
                onClick={handleDelete}
                style={{ opacity: confirmText === "DELETE" ? 1 : 0.5 }}
              >
                <span>Permanently Delete</span>
              </button>
              <button className="pt-admin-btn ghost" onClick={closeModal}>
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
