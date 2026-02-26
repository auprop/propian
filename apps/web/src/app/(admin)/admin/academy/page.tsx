"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  useAdminCourses,
  useAdminCourseDetail,
  useAdminPodcasts,
  useAdminInstructors,
  useAdminCourseStudents,
  useAdminCreateCourse,
  useAdminUpdateCourse,
  useAdminDeleteCourse,
  useAdminCreateModule,
  useAdminUpdateModule,
  useAdminDeleteModule,
  useAdminCreateLesson,
  useAdminUpdateLesson,
  useAdminDeleteLesson,
  useAdminCreatePodcast,
  useAdminUpdatePodcast,
  useAdminDeletePodcast,
  useAdminCreateInstructor,
  useAdminThumbnailLibrary,
  useAdminVideoLibrary,
  useAdminQuizQuestions,
  useAdminUpsertQuizQuestion,
  useAdminDeleteQuizQuestion,
  useAdminCourseAnalytics,
  useAdminAcademyOverviewStats,
  useProSubscriptionConfig,
} from "@propian/shared/hooks";
import type { Lesson } from "@propian/shared/types";

/* ═══════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════ */

const I = {
  Plus: ({ s = 18 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Edit: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
  Trash: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,6 5,6 21,6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  Eye: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  Play: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>,
  Users: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  Star: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>,
  Clock: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></svg>,
  Dollar: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  Up: ({ s = 14 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="22,7 13.5,15.5 8.5,10.5 2,17" /><polyline points="16,7 22,7 22,13" /></svg>,
  Down: ({ s = 14 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="22,17 13.5,8.5 8.5,13.5 2,7" /><polyline points="16,17 22,17 22,11" /></svg>,
  Grip: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" /></svg>,
  Video: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23,7 16,12 23,17" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>,
  File: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>,
  Check: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12" /></svg>,
  Award: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7" /><polyline points="8.21,13.89 7,23 12,20 17,23 15.79,13.88" /></svg>,
  Mic: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>,
  Back: ({ s = 20 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6" /></svg>,
  ChevDown: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6,9 12,15 18,9" /></svg>,
  Upload: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17,8 12,3 7,8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
  Search: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  Headphones: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>,
  Link: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
  Settings: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  Tag: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
  Mail: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22,6 12,13 2,6" /></svg>,
  Shield: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  Download: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  Calendar: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  Layers: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12,2 2,7 12,12 22,7" /><polyline points="2,17 12,22 22,17" /><polyline points="2,12 12,17 22,12" /></svg>,
  Copy: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  X: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Percent: ({ s = 16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>,
};

/* ═══════════════════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════════════════ */

const Av = ({ name, color, size = 28 }: { name: string; color?: string; size?: number }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: color || "var(--lime)", border: "2px solid var(--black)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.35, color: "var(--black)", flexShrink: 0 }}>{name}</div>
);

const Spark = ({ data, color = "var(--lime)", w = 100, h = 28 }: { data: number[]; color?: string; w?: number; h?: number }) => {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return <svg width={w} height={h} style={{ display: "block" }}><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><polyline points={`${pts} ${w},${h} 0,${h}`} fill={`${color}22`} stroke="none" /></svg>;
};

const PBar = ({ pct, color, label, value }: { pct: number; color: string; label: string; value: string }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
      <span className="pt-admin-mono" style={{ fontSize: 12, fontWeight: 600 }}>{value}</span>
    </div>
    <div style={{ height: 8, background: "var(--g100)", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width .5s" }} />
    </div>
  </div>
);

const Toggle = ({ on, onClick }: { on: boolean; onClick?: () => void }) => (
  <div
    onClick={onClick}
    style={{ width: 40, height: 22, borderRadius: 99, background: on ? "var(--lime)" : "var(--g200)", border: "2px solid var(--black)", position: "relative", cursor: "pointer" }}
  >
    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--black)", position: "absolute", top: 1, transition: ".15s", left: on ? 20 : 1 }} />
  </div>
);

const Bc = ({ items }: { items: Array<{ l: string; onClick?: () => void }> }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
    {items.map((it, i) => (
      <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {i > 0 && <span style={{ color: "var(--g300)" }}>/</span>}
        <span
          onClick={it.onClick}
          style={{ fontSize: 12, fontWeight: i === items.length - 1 ? 700 : 500, color: i === items.length - 1 ? "var(--black)" : "var(--g400)", cursor: it.onClick ? "pointer" : "default" }}
          className="pt-admin-mono"
        >
          {it.l}
        </span>
      </span>
    ))}
  </div>
);

const formatDuration = (sec: number) => { const m = Math.floor(sec / 60); const s = sec % 60; return `${m}:${String(Math.floor(s)).padStart(2, "0")}`; };

const levelColor: Record<string, string> = { beginner: "var(--lime)", intermediate: "#f59e0b", advanced: "#ef4444" };
const typeIcon: Record<string, React.ReactNode> = {
  video: <I.Video s={14} />,
  article: <I.File s={14} />,
  quiz: <I.Award s={14} />,
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */

export default function AdminAcademy() {
  const supabase = useMemo(() => createBrowserClient(), []);

  // Data hooks
  const { data: courses } = useAdminCourses(supabase);
  const { data: podcasts } = useAdminPodcasts(supabase);
  const { data: instructors } = useAdminInstructors(supabase);
  const { data: thumbLibrary } = useAdminThumbnailLibrary(supabase);
  const { data: videoLibrary, isLoading: videoLibraryLoading } = useAdminVideoLibrary();

  // Mutations
  const createCourse = useAdminCreateCourse(supabase);
  const updateCourse = useAdminUpdateCourse(supabase);
  const deleteCourse = useAdminDeleteCourse(supabase);
  const createModule = useAdminCreateModule(supabase);
  const updateModule = useAdminUpdateModule(supabase);
  const deleteModule = useAdminDeleteModule(supabase);
  const createLesson = useAdminCreateLesson(supabase);
  const updateLesson = useAdminUpdateLesson(supabase);
  const deleteLesson = useAdminDeleteLesson(supabase);
  const createPodcast = useAdminCreatePodcast(supabase);
  const updatePodcast = useAdminUpdatePodcast(supabase);
  const deletePodcast = useAdminDeletePodcast(supabase);
  const createInstructor = useAdminCreateInstructor(supabase);
  const upsertQuizQuestion = useAdminUpsertQuizQuestion(supabase);
  const deleteQuizQuestion = useAdminDeleteQuizQuestion(supabase);

  // Screen & navigation state
  type Screen = "overview" | "editor" | "lesson-editor" | "lesson-preview" | "lesson-analytics"
    | "instructors" | "instructor-profile" | "add-instructor" | "student-profile"
    | "certificates" | "podcast-editor" | "podcast-settings" | "learning-paths" | "coupons";
  type NavState = { screen: Screen; editCourseId: string | null; editLessonId: string | null; editInstructorId: string | null; editStudentId: string | null; editPodcastId: string | null };

  const [screen, setScreen] = useState<Screen>("overview");
  const [prev, setPrev] = useState<NavState[]>([]);
  const [contentTab, setContentTab] = useState<"courses" | "podcasts">("courses");
  const [editCourseId, setEditCourseId] = useState<string | null>(null);
  const [courseTab, setCourseTab] = useState("curriculum");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchQ, setSearchQ] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");

  // Deep navigation selection state
  const [editLessonId, setEditLessonId] = useState<string | null>(null);
  const [editInstructorId, setEditInstructorId] = useState<string | null>(null);
  const [editStudentId, setEditStudentId] = useState<string | null>(null);
  const [editPodcastId, setEditPodcastId] = useState<string | null>(null);
  const [lessonType, setLessonType] = useState<"video" | "article" | "quiz">("video");

  // Inline editing state
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingPodcastId, setEditingPodcastId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  // Course detail for editor
  const { data: courseDetail } = useAdminCourseDetail(supabase, editCourseId);
  const { data: courseStudents } = useAdminCourseStudents(supabase, editCourseId);
  const { data: courseAnalytics } = useAdminCourseAnalytics(supabase, editCourseId);
  const { data: overviewStats } = useAdminAcademyOverviewStats(supabase);
  const { data: quizQuestions } = useAdminQuizQuestions(supabase, editLessonId);
  const { data: proConfig } = useProSubscriptionConfig(supabase);
  const queryClient = useQueryClient();

  // Stripe sync state
  const [stripeSyncing, setStripeSyncing] = useState(false);
  const [proPrice, setProPrice] = useState("");
  const [proInterval, setProInterval] = useState<"month" | "year">("month");

  // Initialize Pro price form from config
  useEffect(() => {
    if (proConfig && proConfig.amount_cents > 0 && !proPrice) {
      setProPrice((proConfig.amount_cents / 100).toString());
      if (proConfig.interval === "year" || proConfig.interval === "month") {
        setProInterval(proConfig.interval);
      }
    }
  }, [proConfig, proPrice]);

  // Instructor picker state
  const [showInstructorPicker, setShowInstructorPicker] = useState(false);

  // Thumbnail picker & upload state
  const [showThumbPicker, setShowThumbPicker] = useState(false);
  const [thumbPickerTab, setThumbPickerTab] = useState<"library" | "upload">("library");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // Video library picker state
  const [showVideoPicker, setShowVideoPicker] = useState(false);
  const [videoPickerTab, setVideoPickerTab] = useState<"library" | "upload">("library");

  // Confirm delete modal state
  const [confirmModal, setConfirmModal] = useState<{ type: "module" | "lesson" | "course" | "podcast"; id: string; name: string } | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const showToast = useCallback((type: "success" | "error", message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Stripe sync helper
  const syncToStripe = useCallback(async (payload: Record<string, unknown>) => {
    setStripeSyncing(true);
    try {
      const res = await fetch("/api/stripe/sync-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Sync failed");
      }
      const data = await res.json();
      showToast("success", "Synced to Stripe");
      queryClient.invalidateQueries({ queryKey: ["admin", "proSubscriptionConfig"] });
      if (payload.courseId) {
        queryClient.invalidateQueries({ queryKey: ["admin", "courseDetail", payload.courseId] });
      }
      return data;
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Stripe sync failed");
      return null;
    } finally {
      setStripeSyncing(false);
    }
  }, [showToast, queryClient]);

  // Lesson editor form state
  const [lessonForm, setLessonForm] = useState<Record<string, string>>({});
  const lessonVideoRef = useRef<HTMLInputElement>(null);

  // Quiz state
  type QuizQ = { id?: string; question: string; options: string[]; correct_index: number; explanation?: string };
  const [quizDraft, setQuizDraft] = useState<QuizQ[]>([]);
  const [quizDirty, setQuizDirty] = useState(false);

  // Video upload state
  const [uploadingLesson, setUploadingLesson] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nav = useCallback((s: Screen, data?: { courseId?: string; lessonId?: string; instructorId?: string; studentId?: string; podcastId?: string; lessonTypeHint?: "video" | "article" | "quiz" }) => {
    setPrev(p => [...p, { screen, editCourseId, editLessonId: editLessonId, editInstructorId, editStudentId, editPodcastId }]);
    setScreen(s);
    if (data?.courseId !== undefined) setEditCourseId(data.courseId);
    if (data?.lessonId !== undefined) setEditLessonId(data.lessonId);
    if (data?.instructorId !== undefined) setEditInstructorId(data.instructorId);
    if (data?.studentId !== undefined) setEditStudentId(data.studentId);
    if (data?.podcastId !== undefined) setEditPodcastId(data.podcastId);
    if (data?.lessonTypeHint) setLessonType(data.lessonTypeHint);
  }, [screen, editCourseId, editLessonId, editInstructorId, editStudentId, editPodcastId]);

  const goEdit = useCallback((courseId: string) => {
    nav("editor", { courseId });
    setCourseTab("curriculum");
    setExpanded({});
  }, [nav]);

  const goBack = useCallback(() => {
    const p = prev[prev.length - 1];
    if (p) {
      setPrev(pr => pr.slice(0, -1));
      setScreen(p.screen);
      setEditCourseId(p.editCourseId);
      setEditLessonId(p.editLessonId);
      setEditInstructorId(p.editInstructorId);
      setEditStudentId(p.editStudentId);
      setEditPodcastId(p.editPodcastId);
    } else {
      setScreen("overview");
      setEditCourseId(null);
      setEditLessonId(null);
      setEditInstructorId(null);
      setEditStudentId(null);
      setEditPodcastId(null);
    }
  }, [prev]);

  const goOverview = useCallback(() => {
    setScreen("overview");
    setPrev([]);
    setEditCourseId(null);
    setEditLessonId(null);
    setEditInstructorId(null);
    setEditStudentId(null);
    setEditPodcastId(null);
  }, []);

  // Derived data for deep screens
  const currentLesson = useMemo(() => {
    if (!editLessonId || !courseDetail?.modules) return null;
    for (const mod of courseDetail.modules) {
      const les = mod.lessons.find((l: Lesson) => l.id === editLessonId);
      if (les) return les as Lesson;
    }
    return null;
  }, [editLessonId, courseDetail]);

  const currentInstructor = useMemo(() => {
    if (!editInstructorId || !instructors) return null;
    return (instructors as Array<Record<string, unknown>>).find(inst => inst.id === editInstructorId) as Record<string, unknown> | null;
  }, [editInstructorId, instructors]);

  const currentStudent = useMemo(() => {
    if (!editStudentId || !courseStudents) return null;
    const enrollment = courseStudents.find(s => s.user_id === editStudentId);
    return enrollment?.user || null;
  }, [editStudentId, courseStudents]);

  const currentPodcast = useMemo(() => {
    if (!editPodcastId || !podcasts) return null;
    return podcasts.find(p => p.id === editPodcastId) || null;
  }, [editPodcastId, podcasts]);

  // Populate lessonForm when currentLesson changes
  useEffect(() => {
    if (currentLesson && screen === "lesson-editor") {
      setLessonForm({
        title: currentLesson.title || "",
        content: currentLesson.content || "",
        duration_text: currentLesson.duration_text || "",
      });
      setQuizDirty(false);
    }
  }, [currentLesson, screen]);

  // Populate quizDraft from DB when quizQuestions changes
  useEffect(() => {
    if (quizQuestions && !quizDirty) {
      setQuizDraft(quizQuestions.map((q: Record<string, unknown>) => ({
        id: q.id as string,
        question: q.question as string,
        options: q.options as string[],
        correct_index: q.correct_index as number,
        explanation: q.explanation as string | undefined,
      })));
    }
  }, [quizQuestions, quizDirty]);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    return courses.filter((c: Record<string, unknown>) => {
      if (searchQ && !(c.title as string).toLowerCase().includes(searchQ.toLowerCase())) return false;
      if (filterLevel !== "all" && c.level !== filterLevel) return false;
      return true;
    });
  }, [courses, searchQ, filterLevel]);

  // Aggregated stats
  const totalStudents = courses?.reduce((sum: number, c: Record<string, unknown>) => sum + ((c.students_count as number) ?? 0), 0) ?? 0;
  const totalPodcastPlays = podcasts?.reduce((sum, p) => sum + (p.plays_count ?? 0), 0) ?? 0;

  // Video upload handler
  const handleVideoUpload = useCallback(async (lessonId: string, courseId: string, file: File) => {
    setUploadingLesson(lessonId);
    setUploadProgress(0);

    try {
      // 1. Create video in Bunny
      const createRes = await fetch("/api/bunny", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: file.name }),
      });

      if (!createRes.ok) throw new Error("Failed to create video");
      const { videoId, tusEndpoint, authSignature, authExpire, libraryId } = await createRes.json();

      // 2. Upload via TUS (dynamic import to avoid SSR issues)
      const { Upload } = await import("tus-js-client");
      const upload = new Upload(file, {
        endpoint: tusEndpoint,
        retryDelays: [0, 3000, 5000, 10000],
        metadata: {
          filetype: file.type,
          title: file.name,
        },
        headers: {
          AuthorizationSignature: authSignature,
          AuthorizationExpire: String(authExpire),
          VideoId: videoId,
          LibraryId: String(libraryId),
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          setUploadProgress(Math.round((bytesUploaded / bytesTotal) * 100));
        },
        onSuccess: () => {
          // 3. Save bunny_video_id to lesson
          updateLesson.mutate({
            lessonId,
            courseId,
            updates: { bunny_video_id: videoId },
          });
          setUploadingLesson(null);
          setUploadProgress(0);
        },
        onError: (error) => {
          console.error("TUS upload error:", error);
          setUploadingLesson(null);
          setUploadProgress(0);
        },
      });

      upload.start();
    } catch (err) {
      console.error("Video upload failed:", err);
      setUploadingLesson(null);
      setUploadProgress(0);
    }
  }, [updateLesson]);

  // Thumbnail upload handler
  const handleThumbnailUpload = useCallback(async (file: File) => {
    if (!editCourseId) return;
    setThumbnailUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("context", "thumbnail");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      updateCourse.mutate({ courseId: editCourseId, updates: { thumbnail_url: url } });
      setShowThumbPicker(false);
    } catch (err) {
      console.error("Thumbnail upload failed:", err);
    } finally {
      setThumbnailUploading(false);
    }
  }, [editCourseId, updateCourse]);

  const selectFromLibrary = useCallback((url: string) => {
    if (!editCourseId) return;
    updateCourse.mutate({ courseId: editCourseId, updates: { thumbnail_url: url } });
    setShowThumbPicker(false);
  }, [editCourseId, updateCourse]);

  const selectVideoFromLibrary = useCallback((videoGuid: string) => {
    if (!editLessonId || !editCourseId) return;
    updateLesson.mutate({ lessonId: editLessonId, courseId: editCourseId, updates: { bunny_video_id: videoGuid } });
    setShowVideoPicker(false);
  }, [editLessonId, editCourseId, updateLesson]);

  // Inline lesson edit
  const startEditLesson = useCallback((les: Lesson) => {
    setEditingLessonId(les.id);
    setEditForm({ title: les.title, type: les.type, duration_text: les.duration_text || "" });
  }, []);

  const saveEditLesson = useCallback(() => {
    if (!editingLessonId || !editCourseId) return;
    const updates: Record<string, string> = {};
    if (editForm.title) updates.title = editForm.title;
    if (editForm.type) updates.type = editForm.type;
    if (editForm.duration_text) updates.duration_text = editForm.duration_text;
    updateLesson.mutate({ lessonId: editingLessonId, courseId: editCourseId, updates });
    setEditingLessonId(null);
    setEditForm({});
  }, [editingLessonId, editCourseId, editForm, updateLesson]);

  // Inline module rename
  const startEditModule = useCallback((modId: string, title: string) => {
    setEditingModuleId(modId);
    setEditForm({ moduleTitle: title });
  }, []);

  const saveEditModule = useCallback(() => {
    if (!editingModuleId || !editCourseId) return;
    if (editForm.moduleTitle) {
      updateModule.mutate({ moduleId: editingModuleId, courseId: editCourseId, updates: { title: editForm.moduleTitle } });
    }
    setEditingModuleId(null);
    setEditForm({});
  }, [editingModuleId, editCourseId, editForm, updateModule]);

  // Inline podcast edit
  const startEditPodcast = useCallback((p: { id: string; title: string; guest: string | null; duration: string; status: string; description: string | null; audio_url: string | null }) => {
    setEditingPodcastId(p.id);
    setEditForm({ pTitle: p.title, pGuest: p.guest || "", pDuration: p.duration, pStatus: p.status, pDesc: p.description || "", pAudio: p.audio_url || "" });
  }, []);

  const saveEditPodcast = useCallback(() => {
    if (!editingPodcastId) return;
    updatePodcast.mutate({
      podcastId: editingPodcastId,
      updates: {
        title: editForm.pTitle || "Untitled",
        guest: editForm.pGuest || null,
        duration: editForm.pDuration || "00:00",
        status: (editForm.pStatus as "draft" | "scheduled" | "published") || "draft",
        description: editForm.pDesc || null,
        audio_url: editForm.pAudio || null,
      },
    });
    setEditingPodcastId(null);
    setEditForm({});
  }, [editingPodcastId, editForm, updatePodcast]);

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */

  return (
    <div>
      {/* Hidden file input for video uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadingLesson && editCourseId) {
            handleVideoUpload(uploadingLesson, editCourseId, file);
          }
          e.target.value = "";
        }}
      />

      {/* ═══ HEADER ═══ */}
      <div className="pt-admin-section-header">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {screen !== "overview" && (
            <button className="pt-admin-btn-ghost" onClick={goBack} style={{ marginRight: 4 }}>
              <I.Back s={20} />
            </button>
          )}
          <div>
            <div className="pt-admin-section-tag">ADMIN PANEL</div>
            <h2 className="pt-admin-section-title">
              {screen === "overview" && "Academy & Podcasts"}
              {screen === "editor" && (courseDetail?.title || "Course Editor")}
              {screen === "lesson-editor" && (currentLesson?.title || "Lesson Editor")}
              {screen === "lesson-preview" && "Lesson Preview"}
              {screen === "lesson-analytics" && "Lesson Analytics"}
              {screen === "instructors" && "Instructor Management"}
              {screen === "instructor-profile" ? (String(currentInstructor?.name || "Instructor")) : null}
              {screen === "add-instructor" ? "New Instructor" : null}
              {screen === "student-profile" ? (currentStudent?.display_name || currentStudent?.username || "Student") : null}
              {screen === "certificates" && "Certificate Management"}
              {screen === "podcast-editor" && (currentPodcast?.title || "Episode Editor")}
              {screen === "podcast-settings" && "Podcast Settings"}
              {screen === "learning-paths" && "Learning Paths"}
              {screen === "coupons" && "Coupons & Promotions"}
            </h2>
            <p className="pt-admin-section-subtitle">
              {screen === "overview" && "Course management, podcast episodes, and learning analytics"}
              {screen === "editor" && `${courseDetail?.modules?.length ?? 0} modules · ${courseDetail?.modules?.reduce((a: number, m: { lessons: unknown[] }) => a + m.lessons.length, 0) ?? 0} lessons`}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {screen === "overview" && (
            <>
              <button className="pt-admin-btn" onClick={() => nav("instructors")}>
                <I.Users s={15} /> Instructors
              </button>
              <button className="pt-admin-btn" onClick={() => nav("certificates")}>
                <I.Award s={15} /> Certificates
              </button>
              <button className="pt-admin-btn" onClick={() => nav("learning-paths")}>
                <I.Layers s={15} /> Paths
              </button>
              <button className="pt-admin-btn" onClick={() => nav("coupons")}>
                <I.Tag s={15} /> Coupons
              </button>
              <button
                className="pt-admin-btn lime"
                style={{ whiteSpace: "nowrap" }}
                onClick={() => {
                  createCourse.mutate({
                    title: "New Course",
                    slug: `new-course-${Date.now()}`,
                    description: "Course description",
                    level: "beginner",
                    duration_text: "0h",
                    price: "Free",
                    thumbnail_color: "#3b82f6",
                    instructor_id: instructors?.[0]?.id ?? "",
                    status: "draft",
                  }, {
                    onSuccess: (course) => goEdit(course.id),
                  });
                }}
              >
                <I.Plus s={15} /> New Course
              </button>
            </>
          )}
          {screen === "editor" && (
            <>
              {courseDetail?.status && (
                <span className={`pt-admin-badge ${courseDetail.status === "published" ? "green" : courseDetail.status === "archived" ? "red" : "gray"}`} style={{ fontSize: 12, padding: "5px 14px" }}>
                  {courseDetail.status}
                </span>
              )}
              <button className="pt-admin-btn"><I.Eye s={15} /> Preview</button>
              {courseDetail?.status !== "published" ? (
                <button
                  className="pt-admin-btn blk"
                  disabled={updateCourse.isPending}
                  onClick={() => {
                    if (editCourseId) {
                      updateCourse.mutate(
                        { courseId: editCourseId, updates: { status: "published" } },
                        {
                          onSuccess: () => showToast("success", "Course published successfully"),
                          onError: (err) => showToast("error", "Failed to publish: " + (err instanceof Error ? err.message : "Unknown error")),
                        }
                      );
                    }
                  }}
                >
                  {updateCourse.isPending ? "Publishing..." : <><I.Check s={15} /> Publish</>}
                </button>
              ) : (
                <button
                  className="pt-admin-btn"
                  disabled={updateCourse.isPending}
                  onClick={() => {
                    if (editCourseId) {
                      updateCourse.mutate(
                        { courseId: editCourseId, updates: { status: "draft" } },
                        {
                          onSuccess: () => showToast("success", "Course unpublished"),
                          onError: (err) => showToast("error", "Failed to unpublish: " + (err instanceof Error ? err.message : "Unknown error")),
                        }
                      );
                    }
                  }}
                >
                  {updateCourse.isPending ? "Saving..." : "Unpublish"}
                </button>
              )}
            </>
          )}
          {screen === "lesson-editor" && (
            <>
              <button className="pt-admin-btn" onClick={() => { if (editLessonId) nav("lesson-preview", { lessonId: editLessonId }); }}><I.Eye s={15} /> Preview</button>
              <button className="pt-admin-btn blk" disabled={updateLesson.isPending} onClick={() => {
                if (!editLessonId || !editCourseId) return;
                // Save lesson fields
                updateLesson.mutate(
                  { lessonId: editLessonId, courseId: editCourseId, updates: lessonForm },
                  {
                    onSuccess: () => showToast("success", "Lesson saved successfully"),
                    onError: (err) => showToast("error", "Failed to save: " + (err instanceof Error ? err.message : "Unknown error")),
                  }
                );
                // Save quiz questions if on quiz tab and dirty
                if (lessonType === "quiz" && quizDirty) {
                  quizDraft.forEach(q => {
                    upsertQuizQuestion.mutate({ id: q.id, lesson_id: editLessonId, question: q.question, options: q.options, correct_index: q.correct_index, explanation: q.explanation });
                  });
                  setQuizDirty(false);
                }
              }}>{updateLesson.isPending ? "Saving..." : <><I.Check s={15} /> Save</>}</button>
            </>
          )}
          {screen === "instructors" && (
            <button className="pt-admin-btn lime" onClick={() => nav("add-instructor")}>
              <I.Plus s={15} /> New Instructor
            </button>
          )}
        </div>
      </div>

      {/* ═══════════ OVERVIEW ═══════════ */}
      {screen === "overview" && (
        <>
          {/* STATS */}
          <div className="pt-admin-stats">
            {(() => {
              const fmtNum = (n: number) => n > 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
              return [
                { l: "STUDENTS", v: overviewStats ? fmtNum(overviewStats.uniqueStudents) : fmtNum(totalStudents) },
                { l: "ENROLLMENTS", v: overviewStats ? fmtNum(overviewStats.totalEnrollments) : "\u2014" },
                { l: "COMPLETION", v: overviewStats ? `${overviewStats.overallCompletionRate}%` : "\u2014" },
                { l: "CERTIFICATES", v: overviewStats ? String(overviewStats.totalCertificates) : "\u2014" },
                { l: "PODCAST PLAYS", v: fmtNum(totalPodcastPlays) },
              ];
            })().map(s => (
              <div key={s.l} className="pt-admin-stat" style={{ cursor: "default", transition: "transform .15s, box-shadow .15s" }}>
                <div className="pt-admin-stat-label">{s.l}</div>
                <div className="pt-admin-stat-value">{s.v}</div>
              </div>
            ))}
          </div>

          {/* TABS: Courses | Podcasts */}
          <div className="pt-admin-academy-tabs">
            <button className={`pt-admin-academy-tab ${contentTab === "courses" ? "on" : ""}`} onClick={() => setContentTab("courses")}>Courses</button>
            <button className={`pt-admin-academy-tab ${contentTab === "podcasts" ? "on" : ""}`} onClick={() => setContentTab("podcasts")}>Podcasts</button>
          </div>

          {/* ── COURSES LIST ── */}
          {contentTab === "courses" && (
            <>
              <div className="pt-admin-search-bar">
                <div className="pt-admin-inp-wrap" style={{ flex: 1, maxWidth: 320 }}>
                  <div className="pt-admin-inp-icon"><I.Search s={16} /></div>
                  <input className="pt-admin-inp" placeholder="Search courses..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                </div>
                <div className="pt-admin-level-pills">
                  {(["all", "beginner", "intermediate", "advanced"] as const).map(l => (
                    <div key={l} className={`pt-admin-level-pill ${filterLevel === l ? "on" : ""}`} onClick={() => setFilterLevel(l)}>
                      {l === "all" ? "All" : l}
                    </div>
                  ))}
                </div>
              </div>

              {filteredCourses.map((c: Record<string, unknown>) => (
                <div key={c.id as string} className="pt-admin-course-card" onClick={() => goEdit(c.id as string)}>
                  <div className="pt-admin-course-thumb" style={{ background: c.thumbnail_color as string }} />
                  <div className="pt-admin-course-info">
                    <div className="pt-admin-course-name">{c.title as string}</div>
                    <div className="pt-admin-course-meta">
                      <span>{(overviewStats ? (overviewStats.lessonsByCourse[c.id as string] ?? 0) : ((c.lessons_count as number) ?? 0))} lessons</span>
                      <span style={{ color: levelColor[c.level as string] || "var(--g400)", fontWeight: 600 }}>{c.level as string}</span>
                      {(c as Record<string, unknown>).instructors ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Av
                            name={((c as Record<string, unknown>).instructors as Record<string, string>)?.avatar_text || "??"}
                            color={((c as Record<string, unknown>).instructors as Record<string, string>)?.avatar_color}
                            size={20}
                          />
                          {((c as Record<string, unknown>).instructors as Record<string, string>)?.name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="pt-admin-course-stat">
                    <div className="pt-admin-course-stat-v pt-admin-mono">{(overviewStats ? (overviewStats.enrollmentByCourse[c.id as string] ?? 0) : ((c.students_count as number) ?? 0)).toLocaleString()}</div>
                    <div className="pt-admin-course-stat-l pt-admin-mono">students</div>
                  </div>
                  <div className="pt-admin-course-stat">
                    <div className="pt-admin-course-stat-v pt-admin-mono">{c.price as string}</div>
                    <div className="pt-admin-course-stat-l pt-admin-mono">&nbsp;</div>
                  </div>
                  <span className={`pt-admin-badge ${(c.status as string) === "published" ? "green" : "gray"}`}>
                    {(c.status as string) || "published"}
                  </span>
                  <button className="pt-admin-btn sm" onClick={e => { e.stopPropagation(); goEdit(c.id as string); }}>
                    <I.Edit s={13} /> Edit
                  </button>
                </div>
              ))}
            </>
          )}

          {/* ── PODCASTS LIST ── */}
          {contentTab === "podcasts" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: "var(--g400)" }}>
                  {podcasts?.length ?? 0} episodes · {podcasts?.filter(p => p.status === "published").length ?? 0} published
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="pt-admin-btn sm" onClick={() => nav("podcast-settings")}>
                    <I.Settings s={13} /> Settings
                  </button>
                  <button
                    className="pt-admin-btn lime"
                    onClick={() => createPodcast.mutate({ title: "New Episode", duration: "00:00", status: "draft" })}
                  >
                    <I.Plus s={15} /> New Episode
                  </button>
                </div>
              </div>

              <div className="pt-admin-card" style={{ padding: 0 }}>
                <div style={{ padding: "14px 20px", borderBottom: "2px solid var(--g200)", display: "flex", alignItems: "center", gap: 8 }}>
                  <I.Headphones s={18} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Propian Podcast</span>
                  <span className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>Weekly · Prop trading insights & interviews</span>
                </div>
                <div style={{ padding: "8px 20px 20px" }}>
                  {podcasts?.map(p => (
                    <div key={p.id}>
                      <div className="pt-admin-podcast-item" onClick={() => nav("podcast-editor", { podcastId: p.id })} style={{ cursor: "pointer" }}>
                        <button className="pt-admin-podcast-play" onClick={(e) => e.stopPropagation()}>
                          {p.status === "draft" ? <I.Upload s={16} /> : <I.Play s={14} />}
                        </button>
                        <div className="pt-admin-podcast-info">
                          <div className="pt-admin-podcast-title">{p.title}</div>
                          <div className="pt-admin-podcast-meta">
                            {p.guest && <span>with {p.guest}</span>}
                            {p.guest && " · "}
                            <span>{p.duration}</span>
                            {p.publish_date && <> · <span>{new Date(p.publish_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></>}
                          </div>
                        </div>
                        <span className={`pt-admin-badge ${p.status === "published" ? "green" : p.status === "scheduled" ? "scheduled" : "gray"}`}>
                          {p.status}
                        </span>
                        {p.plays_count > 0 && (
                          <div style={{ textAlign: "right", minWidth: 60 }}>
                            <div className="pt-admin-mono" style={{ fontSize: 14, fontWeight: 700 }}>{(p.plays_count / 1000).toFixed(1)}K</div>
                            <div className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>plays</div>
                          </div>
                        )}
                        <button
                          className="pt-admin-btn sm"
                          onClick={(e) => { e.stopPropagation(); editingPodcastId === p.id ? saveEditPodcast() : startEditPodcast(p); }}
                        >
                          {editingPodcastId === p.id ? <><I.Check s={13} /> Save</> : <><I.Edit s={13} /> Edit</>}
                        </button>
                        <button
                          className="pt-admin-btn-ghost"
                          style={{ padding: 4, color: "#ef4444" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmModal({ type: "podcast", id: p.id, name: p.title || "Untitled episode" });
                          }}
                        >
                          <I.Trash s={13} />
                        </button>
                      </div>

                      {/* Inline podcast edit form */}
                      {editingPodcastId === p.id && (
                        <div style={{ padding: "12px 16px 16px 52px", background: "var(--g50)", borderBottom: "1.5px solid var(--g200)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                          <div style={{ flex: 2, minWidth: 200 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, display: "block", color: "var(--g400)" }}>Title</label>
                            <input
                              className="pt-admin-inp"
                              style={{ fontSize: 13, padding: "6px 10px" }}
                              value={editForm.pTitle || ""}
                              onChange={e => setEditForm(f => ({ ...f, pTitle: e.target.value }))}
                              onKeyDown={e => { if (e.key === "Enter") saveEditPodcast(); }}
                              autoFocus
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 140 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, display: "block", color: "var(--g400)" }}>Guest</label>
                            <input
                              className="pt-admin-inp"
                              style={{ fontSize: 13, padding: "6px 10px" }}
                              value={editForm.pGuest || ""}
                              onChange={e => setEditForm(f => ({ ...f, pGuest: e.target.value }))}
                              placeholder="Guest name"
                            />
                          </div>
                          <div style={{ minWidth: 80 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, display: "block", color: "var(--g400)" }}>Duration</label>
                            <input
                              className="pt-admin-inp pt-admin-mono"
                              style={{ fontSize: 13, padding: "6px 10px" }}
                              value={editForm.pDuration || ""}
                              onChange={e => setEditForm(f => ({ ...f, pDuration: e.target.value }))}
                              placeholder="00:00"
                            />
                          </div>
                          <div style={{ minWidth: 110 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, display: "block", color: "var(--g400)" }}>Status</label>
                            <select
                              className="pt-admin-inp"
                              style={{ fontSize: 13, padding: "6px 10px" }}
                              value={editForm.pStatus || "draft"}
                              onChange={e => setEditForm(f => ({ ...f, pStatus: e.target.value }))}
                            >
                              <option value="draft">Draft</option>
                              <option value="scheduled">Scheduled</option>
                              <option value="published">Published</option>
                            </select>
                          </div>
                          <div style={{ width: "100%", marginTop: 4 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, display: "block", color: "var(--g400)" }}>Description</label>
                            <textarea
                              className="pt-admin-inp"
                              rows={2}
                              style={{ fontSize: 13, padding: "6px 10px", resize: "vertical" }}
                              value={editForm.pDesc || ""}
                              onChange={e => setEditForm(f => ({ ...f, pDesc: e.target.value }))}
                              placeholder="Episode description..."
                            />
                          </div>
                          <div style={{ width: "100%" }}>
                            <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, display: "block", color: "var(--g400)" }}>Audio URL</label>
                            <input
                              className="pt-admin-inp pt-admin-mono"
                              style={{ fontSize: 12, padding: "6px 10px" }}
                              value={editForm.pAudio || ""}
                              onChange={e => setEditForm(f => ({ ...f, pAudio: e.target.value }))}
                              placeholder="https://..."
                            />
                          </div>
                          <div style={{ display: "flex", gap: 6, width: "100%", justifyContent: "flex-end" }}>
                            <button className="pt-admin-btn sm lime" onClick={saveEditPodcast}>
                              <I.Check s={12} /> Save
                            </button>
                            <button className="pt-admin-btn sm" onClick={() => { setEditingPodcastId(null); setEditForm({}); }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* PODCAST STATS */}
              <div className="pt-admin-analytics-grid3" style={{ marginTop: 20 }}>
                <div className="pt-admin-card">
                  <div className="pt-admin-card-label">TOP EPISODES</div>
                  {podcasts?.filter(p => p.plays_count > 0).sort((a, b) => b.plays_count - a.plays_count).slice(0, 5).map((p, i) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--g100)" }}>
                      <span className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)", width: 16 }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p.title}</span>
                      <span className="pt-admin-mono" style={{ fontSize: 12, fontWeight: 600 }}>{(p.plays_count / 1000).toFixed(1)}K</span>
                    </div>
                  ))}
                </div>
                <div className="pt-admin-card">
                  <div className="pt-admin-card-label">LISTENER DEMOGRAPHICS</div>
                  <PBar pct={42} color="var(--lime)" label="United States" value="42%" />
                  <PBar pct={18} color="#3b82f6" label="United Kingdom" value="18%" />
                  <PBar pct={14} color="#8b5cf6" label="UAE" value="14%" />
                  <PBar pct={12} color="#f59e0b" label="Nigeria" value="12%" />
                  <PBar pct={8} color="#22c55e" label="India" value="8%" />
                </div>
                <div className="pt-admin-card">
                  <div className="pt-admin-card-label">PODCAST METRICS</div>
                  {[["Avg Listen Duration", "32:18"], ["Completion Rate", "68%"], ["Subscribers", "8,420"], ["Avg per Episode", "12.4K"], ["Apple Rating", "4.8"], ["Spotify Followers", "6.2K"]].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--g100)" }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{l}</span>
                      <span className="pt-admin-mono" style={{ fontSize: 12, fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── LEARNING ANALYTICS ── */}
          <div className="pt-admin-section-divider pt-admin-mono">LEARNING ANALYTICS</div>

          <div className="pt-admin-analytics-grid3">
            {/* ENROLLMENT TREND */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">MONTHLY ENROLLMENTS</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
                {[{ l: "Sep", v: 1200 }, { l: "Oct", v: 1480 }, { l: "Nov", v: 1680 }, { l: "Dec", v: 1420 }, { l: "Jan", v: 2100 }, { l: "Feb", v: 2400 }].map(d => (
                  <div key={d.l} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div className="pt-admin-mono" style={{ fontSize: 9, fontWeight: 600 }}>{(d.v / 1000).toFixed(1)}K</div>
                    <div style={{ width: "100%", background: "var(--lime)", borderRadius: "4px 4px 0 0", height: `${(d.v / 2400) * 80}px`, border: "1.5px solid var(--black)", borderBottom: "none" }} />
                    <span className="pt-admin-mono" style={{ fontSize: 9, color: "var(--g400)" }}>{d.l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* COMPLETION FUNNEL */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">COMPLETION FUNNEL</div>
              {[
                { l: "Enrolled", v: "14,500", pct: 100, c: "var(--lime)" },
                { l: "Started Lesson 1", v: "12,800", pct: 88, c: "var(--lime)" },
                { l: "50% Complete", v: "8,400", pct: 58, c: "#f59e0b" },
                { l: "All Lessons Done", v: "6,200", pct: 43, c: "#f59e0b" },
                { l: "Certificate Earned", v: "4,800", pct: 33, c: "#ef4444" },
              ].map(s => (
                <div key={s.l} style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{s.l}</span>
                    <span className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>{s.v} ({s.pct}%)</span>
                  </div>
                  <div style={{ height: 6, background: "var(--g100)", borderRadius: 99 }}>
                    <div style={{ height: "100%", width: `${s.pct}%`, background: s.c, borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* TOP INSTRUCTORS */}
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">TOP INSTRUCTORS</div>
              {instructors?.slice(0, 5).map(inst => (
                <div key={inst.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--g100)" }}>
                  <Av name={inst.avatar_text} color={inst.avatar_color} size={30} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{inst.name}</div>
                    <div className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>{inst.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ═══════════ COURSE EDITOR ═══════════ */}
      {screen === "editor" && courseDetail && (
        <>
          {/* COURSE STATS BAR */}
          <div className="pt-admin-stats">
            {[
              { l: "Students", v: (courseAnalytics?.enrolledCount ?? courseDetail.students_count ?? 0).toLocaleString() },
              { l: "Completion", v: courseAnalytics ? `${courseAnalytics.completionRate}%` : "—" },
              { l: "Rating", v: "—" },
              { l: "Revenue", v: courseDetail.price === "Free" ? "$0" : "—" },
            ].map(s => (
              <div key={s.l} className="pt-admin-stat">
                <div className="pt-admin-stat-label">{s.l.toUpperCase()}</div>
                <div className="pt-admin-stat-value">{s.v}</div>
              </div>
            ))}
          </div>

          {/* EDITOR TABS */}
          <div className="pt-admin-academy-tabs">
            {(["curriculum", "overview", "pricing", "students", "reviews", "resources", "settings"] as const).map(t => (
              <button key={t} className={`pt-admin-academy-tab ${courseTab === t ? "on" : ""}`} onClick={() => setCourseTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* ── CURRICULUM TAB ── */}
          {courseTab === "curriculum" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: "var(--g400)" }}>
                  {courseDetail.modules?.length ?? 0} modules · {courseDetail.modules?.reduce((a, m) => a + m.lessons.length, 0) ?? 0} lessons
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="pt-admin-btn sm"
                    onClick={() => createModule.mutate({
                      courseId: editCourseId!,
                      title: "New Module",
                      sortOrder: courseDetail.modules?.length ?? 0,
                    }, {
                      onSuccess: (newMod) => {
                        setExpanded(p => ({ ...p, [(newMod as { id: string }).id]: true }));
                        startEditModule((newMod as { id: string }).id, "New Module");
                      },
                    })}
                  >
                    <I.Plus s={13} /> Add Module
                  </button>
                </div>
              </div>

              {courseDetail.modules?.map((mod, mi) => (
                <div key={mod.id} className="pt-admin-module">
                  <div className="pt-admin-module-head" onClick={() => setExpanded(p => ({ ...p, [mod.id]: !p[mod.id] }))}>
                    <div className="pt-admin-module-num pt-admin-mono">{String(mi + 1).padStart(2, "0")}</div>
                    {editingModuleId === mod.id ? (
                      <input
                        className="pt-admin-inp"
                        style={{ flex: 1, fontSize: 13, fontWeight: 700, padding: "4px 8px", margin: 0 }}
                        value={editForm.moduleTitle || ""}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setEditForm(f => ({ ...f, moduleTitle: e.target.value }))}
                        onBlur={saveEditModule}
                        onKeyDown={e => { if (e.key === "Enter") saveEditModule(); if (e.key === "Escape") { setEditingModuleId(null); setEditForm({}); } }}
                        autoFocus
                      />
                    ) : (
                      <div className="pt-admin-module-title">{mod.title}</div>
                    )}
                    <div className="pt-admin-module-count pt-admin-mono">{mod.lessons.length} lessons</div>
                    <I.ChevDown s={16} />
                    <button
                      className="pt-admin-btn-ghost"
                      style={{ padding: 4 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditModule(mod.id, mod.title);
                      }}
                      title="Rename module"
                    >
                      <I.Edit s={13} />
                    </button>
                    <button
                      className="pt-admin-btn-ghost"
                      style={{ padding: 4 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmModal({ type: "module", id: mod.id, name: mod.title || "Module " + (mi + 1) });
                      }}
                    >
                      <I.Trash s={13} />
                    </button>
                  </div>
                  {(expanded[mod.id] !== false) && (
                    <>
                      {mod.lessons.map((les: Lesson) => (
                        <div key={les.id}>
                          <div className="pt-admin-lesson-row" onClick={() => nav("lesson-editor", { lessonId: les.id, courseId: editCourseId!, lessonTypeHint: les.type as "video" | "article" | "quiz" })} style={{ cursor: "pointer" }}>
                            <div className="pt-admin-lesson-grip"><I.Grip s={14} /></div>
                            <div className="pt-admin-lesson-check">
                              <div style={{ width: 6, height: 6, borderRadius: "50%", background: les.bunny_video_id ? "#22c55e" : "var(--g200)" }} />
                            </div>
                            <div className="pt-admin-lesson-title">{les.title}</div>
                            <span className={`pt-admin-lesson-type ${les.type} pt-admin-mono`}>
                              {typeIcon[les.type]} {les.type}
                            </span>
                            <span className="pt-admin-lesson-dur pt-admin-mono">{les.duration_text}</span>

                            {/* Video upload button for video lessons */}
                            {les.type === "video" && !les.bunny_video_id && (
                              <button
                                className="pt-admin-btn-ghost"
                                style={{ padding: 4, color: "#3b82f6" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUploadingLesson(les.id);
                                  fileInputRef.current?.click();
                                }}
                                disabled={!!uploadingLesson}
                                title="Upload video"
                              >
                                <I.Upload s={13} />
                              </button>
                            )}
                            {les.type === "video" && les.bunny_video_id && (
                              <span className="pt-admin-mono" style={{ fontSize: 9, color: "#22c55e", fontWeight: 600 }}>HOSTED</span>
                            )}
                            {uploadingLesson === les.id && (
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 60, height: 4, background: "var(--g100)", borderRadius: 99 }}>
                                  <div style={{ width: `${uploadProgress}%`, height: "100%", background: "var(--lime)", borderRadius: 99, transition: "width .3s" }} />
                                </div>
                                <span className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>{uploadProgress}%</span>
                              </div>
                            )}

                            <div className="pt-admin-lesson-acts">
                              <button
                                className="pt-admin-btn-ghost"
                                style={{ padding: 4 }}
                                onClick={(e) => { e.stopPropagation(); nav("lesson-analytics", { lessonId: les.id, courseId: editCourseId! }); }}
                                title="View analytics"
                              >
                                <I.Eye s={13} />
                              </button>
                              <button
                                className="pt-admin-btn-ghost"
                                style={{ padding: 4 }}
                                onClick={(e) => { e.stopPropagation(); editingLessonId === les.id ? saveEditLesson() : startEditLesson(les); }}
                                title={editingLessonId === les.id ? "Save changes" : "Edit lesson"}
                              >
                                {editingLessonId === les.id ? <I.Check s={13} /> : <I.Edit s={13} />}
                              </button>
                              <button
                                className="pt-admin-btn-ghost"
                                style={{ padding: 4 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmModal({ type: "lesson", id: les.id, name: les.title || "Untitled lesson" });
                                }}
                              >
                                <I.Trash s={13} />
                              </button>
                            </div>
                          </div>

                          {/* Inline edit form */}
                          {editingLessonId === les.id && (
                            <div style={{ padding: "12px 16px 12px 52px", background: "var(--g50)", borderBottom: "1.5px solid var(--g200)", display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                              <div style={{ flex: 2, minWidth: 180 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, display: "block", color: "var(--g400)" }}>Title</label>
                                <input
                                  className="pt-admin-inp"
                                  style={{ fontSize: 13, padding: "6px 10px" }}
                                  value={editForm.title || ""}
                                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                                  onKeyDown={e => { if (e.key === "Enter") saveEditLesson(); if (e.key === "Escape") { setEditingLessonId(null); setEditForm({}); } }}
                                  autoFocus
                                />
                              </div>
                              <div style={{ minWidth: 110 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, display: "block", color: "var(--g400)" }}>Type</label>
                                <select
                                  className="pt-admin-inp"
                                  style={{ fontSize: 13, padding: "6px 10px" }}
                                  value={editForm.type || "video"}
                                  onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                                >
                                  <option value="video">Video</option>
                                  <option value="article">Article</option>
                                  <option value="quiz">Quiz</option>
                                </select>
                              </div>
                              <div style={{ minWidth: 80 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, display: "block", color: "var(--g400)" }}>Duration</label>
                                <input
                                  className="pt-admin-inp pt-admin-mono"
                                  style={{ fontSize: 13, padding: "6px 10px" }}
                                  value={editForm.duration_text || ""}
                                  onChange={e => setEditForm(f => ({ ...f, duration_text: e.target.value }))}
                                  placeholder="5m"
                                  onKeyDown={e => { if (e.key === "Enter") saveEditLesson(); }}
                                />
                              </div>
                              <div style={{ display: "flex", gap: 6, paddingBottom: 1 }}>
                                <button className="pt-admin-btn sm lime" onClick={saveEditLesson}>
                                  <I.Check s={12} /> Save
                                </button>
                                <button className="pt-admin-btn sm" onClick={() => { setEditingLessonId(null); setEditForm({}); }}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add lesson to this module */}
                      <div style={{ padding: "8px 16px 12px 52px" }}>
                        <button
                          className="pt-admin-btn-ghost"
                          style={{ fontSize: 12, color: "var(--g400)", display: "flex", alignItems: "center", gap: 4 }}
                          onClick={() => {
                            createLesson.mutate({
                              module_id: mod.id,
                              course_id: editCourseId!,
                              title: "New Lesson",
                              type: "video",
                              duration_text: "5m",
                              sort_order: mod.lessons?.length ?? 0,
                            }, {
                              onSuccess: (newLesson) => {
                                startEditLesson(newLesson as Lesson);
                              },
                            });
                          }}
                        >
                          <I.Plus s={12} /> Add lesson to this module
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </>
          )}

          {/* ── OVERVIEW TAB ── */}
          {courseTab === "overview" && (
            <div className="pt-admin-analytics-grid2">
              <div className="pt-admin-card">
                <div className="pt-admin-card-label">COURSE DETAILS</div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Course Title</label>
                  <input
                    className="pt-admin-inp"
                    defaultValue={courseDetail.title}
                    onBlur={(e) => {
                      if (e.target.value !== courseDetail.title) {
                        updateCourse.mutate({ courseId: editCourseId!, updates: { title: e.target.value } });
                      }
                    }}
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Description</label>
                  <textarea
                    className="pt-admin-inp"
                    rows={4}
                    defaultValue={courseDetail.description}
                    style={{ resize: "vertical" }}
                    onBlur={(e) => {
                      if (e.target.value !== courseDetail.description) {
                        updateCourse.mutate({ courseId: editCourseId!, updates: { description: e.target.value } });
                      }
                    }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Level</label>
                    <select
                      className="pt-admin-inp"
                      defaultValue={courseDetail.level}
                      onChange={(e) => updateCourse.mutate({ courseId: editCourseId!, updates: { level: e.target.value as "beginner" | "intermediate" | "advanced" } })}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Category</label>
                    <select
                      className="pt-admin-inp"
                      defaultValue={courseDetail.category || ""}
                      onChange={(e) => updateCourse.mutate({ courseId: editCourseId!, updates: { category: e.target.value || null } })}
                    >
                      <option value="">Select category</option>
                      <option>Prop Firm Education</option>
                      <option>Trading Strategy</option>
                      <option>Risk Management</option>
                      <option>Psychology</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 14, position: "relative" }}>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Instructor</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: "var(--g50)", borderRadius: 10, border: "1.5px solid var(--g200)" }}>
                    {courseDetail.instructor ? (
                      <>
                        <Av name={courseDetail.instructor.avatar_text} color={courseDetail.instructor.avatar_color} size={32} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{courseDetail.instructor.name}</div>
                          <div className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>{courseDetail.instructor.role}</div>
                        </div>
                      </>
                    ) : (
                      <div style={{ flex: 1, fontSize: 13, color: "var(--g400)" }}>No instructor assigned</div>
                    )}
                    <button className="pt-admin-btn sm" onClick={() => setShowInstructorPicker(!showInstructorPicker)}>Change</button>
                  </div>
                  {showInstructorPicker && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, marginTop: 4, background: "var(--white)", borderRadius: 10, border: "1.5px solid var(--g200)", boxShadow: "0 8px 24px rgba(0,0,0,.12)", maxHeight: 220, overflowY: "auto" }}>
                      {(instructors as Array<Record<string, unknown>> | undefined)?.map(inst => (
                        <div key={String(inst.id)} onClick={() => { updateCourse.mutate({ courseId: editCourseId!, updates: { instructor_id: String(inst.id) } }); setShowInstructorPicker(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid var(--g100)", background: courseDetail.instructor_id === String(inst.id) ? "var(--g50)" : "transparent" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--g50)"; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = courseDetail.instructor_id === String(inst.id) ? "var(--g50)" : "transparent"; }}>
                          <Av name={String(inst.avatar_text || "??")} color={inst.avatar_color as string} size={28} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{String(inst.name)}</div>
                            <div className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>{String(inst.role || "")}</div>
                          </div>
                          {courseDetail.instructor_id === String(inst.id) && <I.Check s={14} />}
                        </div>
                      ))}
                      {(!instructors || (instructors as Array<unknown>).length === 0) && (
                        <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "var(--g400)" }}>No instructors found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="pt-admin-card" style={{ marginBottom: 16 }}>
                  <div className="pt-admin-card-label">COURSE THUMBNAIL</div>
                  {/* Upload zone — 16:9 */}
                  <div className="pt-admin-thumb-upload" style={{ background: courseDetail.thumbnail_url ? `url(${courseDetail.thumbnail_url}) center/cover` : courseDetail.thumbnail_color }} onClick={() => { setThumbPickerTab("library"); setShowThumbPicker(true); }}>
                    {!courseDetail.thumbnail_url ? (
                      <div className="pt-admin-thumb-overlay">
                        <I.Upload s={24} />
                        <span style={{ fontSize: 12, fontWeight: 600 }}>Choose Thumbnail</span>
                        <span style={{ fontSize: 10, color: "var(--g400)" }}>From library or upload new</span>
                        <span className="pt-admin-mono" style={{ fontSize: 9, color: "rgba(255,255,255,.5)", marginTop: 2 }}>1280 × 720 px recommended (16:9)</span>
                      </div>
                    ) : (
                      <div className="pt-admin-thumb-hover">
                        <I.Edit s={16} />
                        <span style={{ fontSize: 11, fontWeight: 600 }}>Change</span>
                      </div>
                    )}
                  </div>
                  {courseDetail.thumbnail_url && (
                    <div style={{ fontSize: 10, color: "var(--g400)", marginTop: 6, textAlign: "center" }} className="pt-admin-mono">16:9 · Responsive across devices</div>
                  )}

                  {/* Device previews */}
                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div className="pt-admin-mono" style={{ fontSize: 9, fontWeight: 700, color: "var(--g400)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Desktop</div>
                      <div style={{ display: "flex", gap: 6, padding: 6, background: "var(--g50)", borderRadius: 6, border: "1px solid var(--g100)" }}>
                        <div style={{ width: 48, height: 32, borderRadius: 4, flexShrink: 0, background: courseDetail.thumbnail_url ? `url(${courseDetail.thumbnail_url}) center/cover` : courseDetail.thumbnail_color }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 8, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{courseDetail.title}</div>
                          <div style={{ fontSize: 7, color: "var(--g400)" }}>{courseDetail.instructor?.name || "Instructor"}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="pt-admin-mono" style={{ fontSize: 9, fontWeight: 700, color: "var(--g400)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Mobile</div>
                      <div style={{ padding: 4, background: "var(--g50)", borderRadius: 6, border: "1px solid var(--g100)" }}>
                        <div style={{ width: "100%", height: 36, borderRadius: 4, background: courseDetail.thumbnail_url ? `url(${courseDetail.thumbnail_url}) center/cover` : courseDetail.thumbnail_color }} />
                        <div style={{ padding: "3px 2px 0" }}>
                          <div style={{ fontSize: 7, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{courseDetail.title}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Brand color */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "8px 0", borderTop: "1px solid var(--g100)" }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--g400)", whiteSpace: "nowrap" }}>Brand Color</label>
                    <div style={{ position: "relative", width: 24, height: 24, flexShrink: 0 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: courseDetail.thumbnail_color, border: "1.5px solid var(--g200)", cursor: "pointer" }} />
                      <input type="color" value={courseDetail.thumbnail_color} onChange={e => updateCourse.mutate({ courseId: editCourseId!, updates: { thumbnail_color: e.target.value } })} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                    </div>
                    <input className="pt-admin-inp pt-admin-mono" value={courseDetail.thumbnail_color} onChange={e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) updateCourse.mutate({ courseId: editCourseId!, updates: { thumbnail_color: e.target.value } }); }} style={{ fontSize: 11, padding: "4px 8px", width: 80, textTransform: "uppercase" }} />
                  </div>
                </div>
                <div className="pt-admin-card" style={{ marginBottom: 16 }}>
                  <div className="pt-admin-card-label">TAGS</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(courseDetail.tags || ["prop trading", "fundamentals"]).map(t => (
                      <span key={t} className="pt-admin-mono" style={{ padding: "4px 12px", background: "var(--g100)", border: "1.5px solid var(--g200)", borderRadius: 99, fontSize: 11, fontWeight: 600, color: "var(--g600)" }}>{t}</span>
                    ))}
                    <button className="pt-admin-btn-ghost" style={{ padding: "4px 8px", fontSize: 11 }}><I.Plus s={12} /> Add</button>
                  </div>
                </div>
                <div className="pt-admin-card">
                  <div className="pt-admin-card-label">CERTIFICATE</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <I.Award s={24} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Certificate of Completion</div>
                      <div style={{ fontSize: 11, color: "var(--g400)" }}>Auto-issued when all lessons & quizzes are complete</div>
                    </div>
                    <Toggle on={courseDetail.certificate_enabled !== false} onClick={() => updateCourse.mutate({ courseId: editCourseId!, updates: { certificate_enabled: courseDetail.certificate_enabled === false } })} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PRICING TAB ── */}
          {courseTab === "pricing" && (
            <div className="pt-admin-analytics-grid2">
              <div className="pt-admin-card">
                <div className="pt-admin-card-label">PRICING MODEL</div>
                <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                  {[
                    { l: "Free", d: "No charge", type: "free" as const },
                    { l: "One-time", d: "Single payment", type: "one_time" as const },
                    { l: "Pro Only", d: "Subscription required", type: "pro_only" as const },
                  ].map(o => {
                    const isActive = (courseDetail.price_type ?? (courseDetail.price === "Free" ? "free" : "one_time")) === o.type;
                    return (
                      <div
                        key={o.l}
                        className={`pt-admin-pricing-option ${isActive ? "active" : ""}`}
                        onClick={async () => {
                          const updates: Record<string, unknown> = { price_type: o.type };
                          if (o.type === "free") {
                            updates.price = "Free";
                            updates.price_cents = 0;
                          } else if (o.type === "pro_only") {
                            updates.price = "Pro";
                            updates.price_cents = 0;
                          }
                          updateCourse.mutate({ courseId: editCourseId!, updates });
                          // Sync to Stripe — archive price if switching away from one_time
                          if (o.type !== "one_time" && courseDetail?.stripe_price_id) {
                            syncToStripe({ courseId: editCourseId!, title: courseDetail.title, priceCents: 0 });
                          }
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{o.l}</div>
                        <div style={{ fontSize: 11, color: "var(--g400)", marginTop: 2 }}>{o.d}</div>
                        {isActive && (
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--lime)", border: "2px solid var(--black)", margin: "8px auto 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <I.Check s={12} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {(courseDetail.price_type ?? (courseDetail.price === "Free" ? "free" : "one_time")) === "one_time" && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Price (USD)</label>
                    <input
                      className="pt-admin-inp pt-admin-mono"
                      defaultValue={courseDetail.price?.replace("$", "")}
                      type="number"
                      style={{ fontSize: 20, fontWeight: 700 }}
                      onBlur={async (e) => {
                        const val = e.target.value;
                        if (val) {
                          const cents = Math.round(parseFloat(val) * 100);
                          updateCourse.mutate({ courseId: editCourseId!, updates: { price: `$${val}`, price_cents: cents, price_type: "one_time" } });
                          // Auto-sync to Stripe
                          syncToStripe({ courseId: editCourseId!, title: courseDetail?.title ?? "Course", priceCents: cents });
                        }
                      }}
                    />
                  </div>
                )}

                {/* Stripe sync status */}
                <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--g50)", borderRadius: 10, border: "1px solid var(--g100)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <I.Tag s={14} />
                    <span style={{ fontSize: 12, fontWeight: 700 }}>STRIPE STATUS</span>
                    {stripeSyncing && <span style={{ fontSize: 11, color: "var(--g400)", marginLeft: "auto" }}>Syncing...</span>}
                  </div>
                  {courseDetail?.stripe_product_id ? (
                    <div style={{ fontSize: 12, color: "var(--g500)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: courseDetail.stripe_price_id ? "var(--lime)" : "#f59e0b" }} />
                        <span>Product: <span className="pt-admin-mono" style={{ fontSize: 11 }}>{courseDetail.stripe_product_id.slice(0, 20)}...</span></span>
                      </div>
                      {courseDetail.stripe_price_id && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--lime)" }} />
                          <span>Price: <span className="pt-admin-mono" style={{ fontSize: 11 }}>{courseDetail.stripe_price_id.slice(0, 20)}...</span></span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--g400)" }}>
                      {(courseDetail?.price_type ?? "free") === "one_time"
                        ? "Set a price and it will auto-sync to Stripe"
                        : "No Stripe product (not a paid course)"}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-admin-card">
                <div className="pt-admin-card-label">REVENUE BREAKDOWN</div>
                {[
                  ["Total Revenue", courseDetail.price === "Free" ? "$0" : "\u2014"],
                  ["Students (paid)", courseDetail.price === "Free" ? "N/A" : "\u2014"],
                  ["Avg Revenue / Student", courseDetail.price === "Free" ? "$0" : courseDetail.price],
                  ["Refund Rate", "\u2014"],
                  ["Refunds Processed", "\u2014"],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--g100)" }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{l}</span>
                    <span className="pt-admin-mono" style={{ fontSize: 13, fontWeight: 700 }}>{v}</span>
                  </div>
                ))}

                {/* Pro Subscription Config */}
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: "2px solid var(--g100)" }}>
                  <div className="pt-admin-card-label">PRO SUBSCRIPTION PRICING</div>
                  <div style={{ fontSize: 12, color: "var(--g400)", marginBottom: 14 }}>
                    Set the Pro subscription price. All "Pro Only" courses are accessible with an active subscription.
                  </div>

                  <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Price (USD)</label>
                      <input
                        className="pt-admin-inp pt-admin-mono"
                        value={proPrice}
                        onChange={(e) => setProPrice(e.target.value)}
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="9.99"
                        style={{ fontSize: 18, fontWeight: 700 }}
                      />
                    </div>
                    <div style={{ width: 140 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Interval</label>
                      <div style={{ display: "flex", gap: 6 }}>
                        {(["month", "year"] as const).map(iv => (
                          <div
                            key={iv}
                            onClick={() => setProInterval(iv)}
                            style={{
                              flex: 1, padding: "10px 0", textAlign: "center", borderRadius: 8,
                              border: `2px solid ${proInterval === iv ? "var(--black)" : "var(--g200)"}`,
                              background: proInterval === iv ? "var(--lime)" : "var(--white)",
                              fontWeight: 700, fontSize: 13, cursor: "pointer",
                            }}
                          >
                            {iv === "month" ? "Monthly" : "Yearly"}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    className="pt-admin-btn lime"
                    disabled={stripeSyncing || !proPrice || !parseFloat(proPrice) || parseFloat(proPrice) <= 0}
                    onClick={() => {
                      const parsed = parseFloat(proPrice);
                      if (!parsed || parsed <= 0) return;
                      const cents = Math.round(parsed * 100);
                      syncToStripe({ type: "pro", amountCents: cents, interval: proInterval });
                    }}
                    style={{ width: "100%", justifyContent: "center", padding: "12px 18px", marginTop: 4, opacity: (stripeSyncing || !proPrice || !parseFloat(proPrice) || parseFloat(proPrice) <= 0) ? 0.5 : 1 }}
                  >
                    <span>{stripeSyncing ? "Syncing to Stripe..." : proConfig?.price_id ? "Update Pro Price on Stripe" : "Create Pro Product on Stripe"}</span>
                    <span className="pt-admin-btn-icon"><I.Dollar s={16} /></span>
                  </button>

                  {proConfig?.price_id && (
                    <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--g50)", borderRadius: 8, border: "1px solid var(--g100)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--lime)" }} />
                        <span style={{ fontSize: 12, fontWeight: 700 }}>Active on Stripe</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--g400)" }} className="pt-admin-mono">
                        ${(proConfig.amount_cents / 100).toFixed(2)}/{proConfig.interval} &middot; {proConfig.price_id.slice(0, 24)}...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STUDENTS TAB ── */}
          {courseTab === "students" && (
            <>
              <div className="pt-admin-analytics-grid3" style={{ marginBottom: 16 }}>
                <div className="pt-admin-stat" style={{ cursor: "default" }}>
                  <div className="pt-admin-stat-label">ENROLLED</div>
                  <div className="pt-admin-stat-value">{(courseAnalytics?.enrolledCount ?? courseDetail.students_count ?? 0).toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: "var(--g400)", marginTop: 4 }}>
                    {courseAnalytics ? `+${courseAnalytics.enrolledThisWeek} this week` : "\u2014"}
                  </div>
                </div>
                <div className="pt-admin-stat" style={{ cursor: "default" }}>
                  <div className="pt-admin-stat-label">ACTIVE LEARNERS</div>
                  <div className="pt-admin-stat-value">{courseAnalytics?.activeLearners?.toLocaleString() ?? "\u2014"}</div>
                  <div style={{ fontSize: 11, color: "var(--g400)", marginTop: 4 }}>Enrolled in last 7 days</div>
                </div>
                <div className="pt-admin-stat" style={{ cursor: "default" }}>
                  <div className="pt-admin-stat-label">CERTIFICATES ISSUED</div>
                  <div className="pt-admin-stat-value">{courseAnalytics?.certificatesIssued?.toLocaleString() ?? "\u2014"}</div>
                  <div style={{ fontSize: 11, color: "var(--g400)", marginTop: 4 }}>
                    {courseAnalytics ? `${courseAnalytics.completionRate}% completion rate` : "\u2014"}
                  </div>
                </div>
              </div>

              <div className="pt-admin-analytics-grid2">
                <div className="pt-admin-card">
                  <div className="pt-admin-card-label">LESSON DROP-OFF</div>
                  {courseAnalytics?.lessonDropOff?.map((les) => {
                    const pct = les.completionPct;
                    return (
                      <div key={les.lessonId} style={{ marginBottom: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ fontSize: 11, color: "var(--g600)", maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{les.lessonTitle}</span>
                          <span className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>{pct}%</span>
                        </div>
                        <div style={{ height: 5, background: "var(--g100)", borderRadius: 99 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: pct > 60 ? "var(--lime)" : pct > 30 ? "#f59e0b" : "#ef4444", borderRadius: 99 }} />
                        </div>
                      </div>
                    );
                  })}
                  {(!courseAnalytics?.lessonDropOff || courseAnalytics.lessonDropOff.length === 0) && (
                    <div style={{ fontSize: 13, color: "var(--g400)", padding: "20px 0", textAlign: "center" }}>No lesson data yet</div>
                  )}
                </div>

                <div className="pt-admin-card">
                  <div className="pt-admin-card-label">RECENT STUDENTS</div>
                  {courseStudents?.slice(0, 7).map(s => (
                    <div key={s.user_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--g100)", cursor: "pointer" }} onClick={() => nav("student-profile", { studentId: s.user_id })}>
                      <Av name={s.user?.display_name?.slice(0, 2).toUpperCase() || "??"} size={30} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{s.user?.display_name || s.user?.username || "Student"}</div>
                        <div className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>
                          Joined {new Date(s.enrolled_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      </div>
                      <div style={{ width: 80 }}>
                        <div style={{ height: 6, background: "var(--g100)", borderRadius: 99, marginBottom: 2 }}>
                          <div style={{ height: "100%", width: `${s.progress_pct}%`, background: s.progress_pct === 100 ? "#22c55e" : "var(--lime)", borderRadius: 99 }} />
                        </div>
                        <div className="pt-admin-mono" style={{ fontSize: 9, color: "var(--g400)", textAlign: "right" }}>{s.progress_pct}%</div>
                      </div>
                    </div>
                  ))}
                  {(!courseStudents || courseStudents.length === 0) && (
                    <div style={{ fontSize: 13, color: "var(--g400)", padding: "20px 0", textAlign: "center" }}>No students enrolled yet</div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── REVIEWS TAB ── */}
          {courseTab === "reviews" && (
            <div className="pt-admin-analytics-grid23">
              <div className="pt-admin-card">
                <div className="pt-admin-card-label">STUDENT REVIEWS</div>
                {/* Reviews will come from real data when course reviews table is added */}
                {[
                  { n: "Jake Mitchell", av: "JM", c: "#3b82f6", r: 5, t: "Best prop firm course out there. The content is incredibly clear and actionable.", d: "3 days ago" },
                  { n: "Priya Shah", av: "PS", c: "#8b5cf6", r: 4, t: "Great content! Would love more practice exercises and case studies.", d: "1 week ago" },
                  { n: "Carlos Ruiz", av: "CR", c: "#ec4899", r: 5, t: "Finally someone explains drawdown rules properly. Highly focused prop firm education.", d: "1 week ago" },
                  { n: "Aisha Bello", av: "AB", c: "#22c55e", r: 4, t: "Solid fundamentals course. A few video lessons could be shorter. Overall highly recommend.", d: "2 weeks ago" },
                  { n: "Tom Hartley", av: "TH", c: "#f59e0b", r: 5, t: "Incredible teacher. The backtesting module changed my approach completely.", d: "2 weeks ago" },
                ].map((rev, i) => (
                  <div key={i} style={{ padding: "14px 0", borderBottom: "1px solid var(--g100)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <Av name={rev.av} color={rev.c} size={28} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{rev.n}</div>
                        <div className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>{rev.d}</div>
                      </div>
                      <div style={{ fontSize: 12, color: "#f59e0b" }}>{"★".repeat(rev.r)}</div>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--g600)", lineHeight: 1.5, paddingLeft: 38 }}>{rev.t}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="pt-admin-card" style={{ marginBottom: 16 }}>
                  <div className="pt-admin-card-label">RATING OVERVIEW</div>
                  <div style={{ textAlign: "center", marginBottom: 14 }}>
                    <div className="pt-admin-mono" style={{ fontSize: 48, fontWeight: 800, letterSpacing: -2 }}>4.8</div>
                    <div style={{ fontSize: 16, color: "#f59e0b" }}>★★★★★</div>
                    <div className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)", marginTop: 4 }}>{courseDetail.students_count || 0} ratings</div>
                  </div>
                  {([["5 star", 68, "#22c55e"], ["4 star", 22, "var(--lime)"], ["3 star", 6, "#f59e0b"], ["2 star", 3, "#ef4444"], ["1 star", 1, "#dc2626"]] as const).map(([l, p, c]) => (
                    <div key={l} className="pt-admin-rating-row">
                      <span className="pt-admin-rating-label pt-admin-mono">{l}</span>
                      <div className="pt-admin-rating-bar">
                        <div className="pt-admin-rating-bar-fill" style={{ width: `${p}%`, background: c }} />
                      </div>
                      <span className="pt-admin-rating-pct pt-admin-mono">{p}%</span>
                    </div>
                  ))}
                </div>

                <div className="pt-admin-card">
                  <div className="pt-admin-card-label">COMMON FEEDBACK</div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#16a34a", marginBottom: 6 }}>PRAISED</div>
                    {["Clear explanations", "Practical examples", "Good video quality", "Actionable content"].map(t => (
                      <span key={t} className="pt-admin-feedback-tag positive pt-admin-mono">{t}</span>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#d97706", marginBottom: 6 }}>SUGGESTED</div>
                    {["More quizzes", "Shorter videos", "Add downloadable PDFs", "More case studies"].map(t => (
                      <span key={t} className="pt-admin-feedback-tag suggestion pt-admin-mono">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── RESOURCES TAB ── */}
          {courseTab === "resources" && (
            <div className="pt-admin-analytics-grid2">
              <div className="pt-admin-card">
                <div className="pt-admin-card-label">DOWNLOADABLE FILES</div>
                {[{ n: "Prop Firm Checklist.pdf", size: "240 KB", mod: "Module 1" }, { n: "Trading Plan Template.xlsx", size: "84 KB", mod: "Module 2" }, { n: "Risk Calculator.xlsx", size: "128 KB", mod: "Module 3" }].map(f => (
                  <div key={f.n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--g100)" }}>
                    <I.File s={16} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{f.n}</div>
                      <div className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>{f.size} · {f.mod}</div>
                    </div>
                    <button className="pt-admin-btn-ghost"><I.Download s={14} /></button>
                    <button className="pt-admin-btn-ghost"><I.Trash s={14} /></button>
                  </div>
                ))}
                <div className="pt-admin-upload-zone" style={{ marginTop: 12 }}>
                  <I.Upload s={20} />
                  <span style={{ fontWeight: 600 }}>Upload Resource</span>
                  <span style={{ fontSize: 10, color: "var(--g400)" }}>PDF, XLSX, ZIP up to 50MB</span>
                </div>
              </div>
              <div className="pt-admin-card">
                <div className="pt-admin-card-label">EXTERNAL LINKS</div>
                {[{ n: "FTMO Official Rules", url: "ftmo.com/rules" }, { n: "Risk Calculator Tool", url: "propian.com/tools/risk" }].map(l => (
                  <div key={l.n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--g100)" }}>
                    <I.Link s={14} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{l.n}</div>
                      <div className="pt-admin-mono" style={{ fontSize: 10, color: "#3b82f6" }}>{l.url}</div>
                    </div>
                    <button className="pt-admin-btn-ghost"><I.Edit s={14} /></button>
                  </div>
                ))}
                <button className="pt-admin-btn sm" style={{ marginTop: 10 }}><I.Plus s={12} /> Add Link</button>
              </div>
            </div>
          )}

          {/* ── SETTINGS TAB ── */}
          {courseTab === "settings" && (
            <div className="pt-admin-analytics-grid2">
              <div className="pt-admin-card">
                <div className="pt-admin-card-label">ENROLLMENT</div>
                {([["Max enrollment", "Unlimited", true], ["Require prerequisites", "None set", false], ["Self-enrollment", "Anyone can enroll", true], ["Featured course", "Show on homepage", false]] as const).map(([l, d, on]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--g100)" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{l}</div>
                      <div style={{ fontSize: 11, color: "var(--g400)" }}>{d}</div>
                    </div>
                    <Toggle on={on} />
                  </div>
                ))}
              </div>
              <div className="pt-admin-card">
                <div className="pt-admin-card-label">SEO & VISIBILITY</div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>URL Slug</label>
                  <input className="pt-admin-inp pt-admin-mono" defaultValue={courseDetail?.slug || ""} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Meta Title</label>
                  <input className="pt-admin-inp" defaultValue={courseDetail?.title || ""} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Meta Description</label>
                  <textarea className="pt-admin-inp" rows={3} defaultValue={courseDetail?.description || ""} style={{ resize: "vertical" }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Visibility</label>
                  <select className="pt-admin-inp">
                    <option>Public</option>
                    <option>Unlisted</option>
                    <option>Private</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Delete course button at bottom */}
          <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--g200)", display: "flex", justifyContent: "flex-end" }}>
            <button
              className="pt-admin-btn danger"
              onClick={() => {
                setConfirmModal({ type: "course", id: editCourseId!, name: courseDetail?.title || "this course" });
              }}
            >
              <I.Trash s={14} /> Delete Course
            </button>
          </div>
        </>
      )}

      {/* ═══════════ LESSON EDITOR ═══════════ */}
      {screen === "lesson-editor" && currentLesson && (
        <>
          <Bc items={[{ l: "Academy", onClick: goOverview }, { l: courseDetail?.title || "Course", onClick: goBack }, { l: currentLesson.title }]} />
          <div className="pt-admin-academy-tabs" style={{ marginBottom: 16 }}>
            {(["video", "article", "quiz"] as const).map(t => (
              <button key={t} className={`pt-admin-academy-tab ${lessonType === t ? "on" : ""}`} onClick={() => setLessonType(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* VIDEO TAB */}
          {lessonType === "video" && (
            <div className="pt-admin-analytics-grid23">
              <input ref={lessonVideoRef} type="file" accept="video/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f && editLessonId && editCourseId) { handleVideoUpload(editLessonId, editCourseId, f); setShowVideoPicker(false); } e.target.value = ""; }} />
              <div>
                <div className="pt-admin-card" style={{ marginBottom: 14 }}>
                  <div className="pt-admin-card-label">VIDEO</div>
                  {uploadingLesson === editLessonId ? (
                    <div style={{ aspectRatio: "16/9", borderRadius: 14, border: "2px solid var(--black)", background: "#0f172a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      <div className="pt-admin-spinner" style={{ borderColor: "rgba(255,255,255,.2)", borderTopColor: "var(--lime)", width: 32, height: 32 }} />
                      <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Uploading... {uploadProgress}%</span>
                      <div style={{ width: "60%", height: 4, background: "rgba(255,255,255,.15)", borderRadius: 99 }}>
                        <div style={{ height: "100%", width: uploadProgress + "%", background: "var(--lime)", borderRadius: 99, transition: "width .3s" }} />
                      </div>
                    </div>
                  ) : currentLesson.bunny_video_id ? (
                    <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 14, overflow: "hidden", background: "#0f172a", border: "2px solid var(--black)" }}>
                      <iframe
                        src={`https://iframe.mediadelivery.net/embed/${process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID}/${currentLesson.bunny_video_id}?autoplay=false&preload=true`}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="pt-admin-upload-zone" style={{ aspectRatio: "16/9", cursor: "pointer" }} onClick={() => { setVideoPickerTab("library"); setShowVideoPicker(true); }}>
                      <I.Upload s={24} />
                      <span style={{ fontWeight: 600 }}>Upload Video</span>
                      <span style={{ fontSize: 10, color: "var(--g400)" }}>MP4, MOV up to 2GB</span>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button className="pt-admin-btn sm" onClick={() => { setVideoPickerTab("library"); setShowVideoPicker(true); }}><I.Video s={12} /> Choose Video</button>
                    <button className="pt-admin-btn sm" onClick={() => { setThumbPickerTab("library"); setShowThumbPicker(true); }}><I.Upload s={12} /> Upload Thumbnail</button>
                  </div>
                </div>
                <div className="pt-admin-card">
                  <div className="pt-admin-card-label">LESSON DETAILS</div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Title</label>
                    <input className="pt-admin-inp" value={lessonForm.title || ""} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Description</label>
                    <textarea className="pt-admin-inp" rows={3} placeholder="What will students learn in this lesson?" style={{ resize: "vertical" }} value={lessonForm.content || ""} onChange={e => setLessonForm(p => ({ ...p, content: e.target.value }))} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Duration</label>
                      <input className="pt-admin-inp" value={lessonForm.duration_text || ""} onChange={e => setLessonForm(p => ({ ...p, duration_text: e.target.value }))} placeholder="e.g. 12 min" />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Status</label>
                      <select className="pt-admin-inp"><option>Published</option><option>Draft</option></select>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="pt-admin-card" style={{ marginBottom: 14 }}>
                  <div className="pt-admin-card-label">CAPTIONS</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Auto-generate captions</span>
                    <Toggle on={true} />
                  </div>
                  {[["English", "Generated"], ["Spanish", "Generated"]].map(([l, s]) => (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--g100)" }}>
                      <span style={{ flex: 1, fontSize: 12 }}>{l}</span>
                      <span className="pt-admin-mono" style={{ fontSize: 10, color: "#16a34a" }}>{s}</span>
                      <button className="pt-admin-btn-ghost"><I.Edit s={12} /></button>
                    </div>
                  ))}
                </div>
                <div className="pt-admin-card" style={{ marginBottom: 14 }}>
                  <div className="pt-admin-card-label">RESOURCES</div>
                  <div className="pt-admin-upload-zone">
                    <I.Upload s={18} />
                    <span style={{ fontWeight: 600 }}>Attach files</span>
                  </div>
                </div>
                <div className="pt-admin-card">
                  <div className="pt-admin-card-label">COMPLETION RULES</div>
                  {([["Must watch 90% to complete", true], ["Allow playback speed change", true], ["Allow skip forward", false]] as const).map(([l, on]) => (
                    <div key={l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--g100)" }}>
                      <span style={{ fontSize: 12 }}>{l}</span>
                      <Toggle on={on} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ARTICLE TAB */}
          {lessonType === "article" && (
            <div className="pt-admin-analytics-grid23">
              <div className="pt-admin-card">
                <div className="pt-admin-card-label">ARTICLE CONTENT</div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Title</label>
                  <input className="pt-admin-inp" value={lessonForm.title || ""} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div style={{ border: "2px solid var(--g200)", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ display: "flex", gap: 2, padding: "6px 10px", background: "var(--g50)", borderBottom: "1px solid var(--g200)" }}>
                    {["B", "I", "U", "H1", "H2", "•", "1.", "Link", "Img", "Code"].map(b => (
                      <button key={b} style={{ padding: "3px 8px", border: "none", background: "none", fontWeight: b === "B" ? 700 : 400, fontStyle: b === "I" ? "italic" : "normal", textDecoration: b === "U" ? "underline" : "none", cursor: "pointer", fontSize: 12, borderRadius: 4 }}>{b}</button>
                    ))}
                  </div>
                  <textarea className="pt-admin-inp" rows={16} placeholder="Write your article content here... Supports markdown formatting." style={{ border: "none", borderRadius: 0, resize: "vertical", fontSize: 14, lineHeight: 1.7 }} value={lessonForm.content || ""} onChange={e => setLessonForm(p => ({ ...p, content: e.target.value }))} />
                </div>
              </div>
              <div>
                <div className="pt-admin-card" style={{ marginBottom: 14 }}>
                  <div className="pt-admin-card-label">SETTINGS</div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Estimated read time</label>
                    <input className="pt-admin-inp" value={lessonForm.duration_text || ""} onChange={e => setLessonForm(p => ({ ...p, duration_text: e.target.value }))} placeholder="e.g. 5 min read" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Status</label>
                    <select className="pt-admin-inp"><option>Published</option><option>Draft</option></select>
                  </div>
                </div>
                <div className="pt-admin-card">
                  <div className="pt-admin-card-label">IMAGES</div>
                  <div className="pt-admin-upload-zone">
                    <I.Upload s={18} />
                    <span style={{ fontWeight: 600 }}>Upload images</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* QUIZ TAB */}
          {lessonType === "quiz" && (
            <div className="pt-admin-analytics-grid23">
              <div className="pt-admin-card">
                <div className="pt-admin-card-label">QUIZ BUILDER</div>
                {quizDraft.length === 0 && (
                  <div style={{ padding: "24px 12px", textAlign: "center", color: "var(--g400)" }}>
                    <I.Award s={28} />
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>No questions yet</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>Add your first question to build the quiz</div>
                  </div>
                )}
                {quizDraft.map((question, qi) => (
                  <div key={question.id || qi} style={{ padding: 14, border: "2px solid var(--g200)", borderRadius: 10, marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                      <span className="pt-admin-mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--g400)", marginTop: 2 }}>Q{qi + 1}</span>
                      <input className="pt-admin-inp" value={question.question} onChange={e => { const v = e.target.value; setQuizDraft(prev => prev.map((q, i) => i === qi ? { ...q, question: v } : q)); setQuizDirty(true); }} style={{ flex: 1, fontWeight: 600 }} placeholder="Enter question..." />
                      <button className="pt-admin-btn-ghost" onClick={() => {
                        if (question.id && editLessonId) {
                          deleteQuizQuestion.mutate({ questionId: question.id, lessonId: editLessonId });
                        }
                        setQuizDraft(prev => prev.filter((_, i) => i !== qi));
                        setQuizDirty(true);
                      }}><I.Trash s={14} /></button>
                    </div>
                    {question.options.map((opt, oi) => (
                      <div key={oi} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, paddingLeft: 28 }}>
                        <div onClick={() => { setQuizDraft(prev => prev.map((q, i) => i === qi ? { ...q, correct_index: oi } : q)); setQuizDirty(true); }} style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${oi === question.correct_index ? "#16a34a" : "var(--g200)"}`, background: oi === question.correct_index ? "#dcfce7" : "var(--white)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                          {oi === question.correct_index && <I.Check s={10} />}
                        </div>
                        <input className="pt-admin-inp" value={opt} onChange={e => { const v = e.target.value; setQuizDraft(prev => prev.map((q, i) => i === qi ? { ...q, options: q.options.map((o, j) => j === oi ? v : o) } : q)); setQuizDirty(true); }} style={{ flex: 1, fontSize: 12 }} placeholder="Option text..." />
                        {question.options.length > 2 && (
                          <button className="pt-admin-btn-ghost" style={{ padding: 2 }} onClick={() => { setQuizDraft(prev => prev.map((q, i) => i === qi ? { ...q, options: q.options.filter((_, j) => j !== oi), correct_index: q.correct_index >= oi && q.correct_index > 0 ? q.correct_index - 1 : q.correct_index } : q)); setQuizDirty(true); }}><I.X s={10} /></button>
                        )}
                      </div>
                    ))}
                    <button className="pt-admin-btn-ghost" style={{ marginLeft: 28, marginTop: 6, fontSize: 11 }} onClick={() => { setQuizDraft(prev => prev.map((q, i) => i === qi ? { ...q, options: [...q.options, ""] } : q)); setQuizDirty(true); }}><I.Plus s={11} /> Add option</button>
                  </div>
                ))}
                <button className="pt-admin-btn lime" style={{ width: "100%" }} onClick={() => { setQuizDraft(prev => [...prev, { question: "", options: ["", "", "", ""], correct_index: 0 }]); setQuizDirty(true); }}><I.Plus s={14} /> Add Question</button>
              </div>
              <div>
                <div className="pt-admin-card" style={{ marginBottom: 14 }}>
                  <div className="pt-admin-card-label">QUIZ SETTINGS</div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Pass threshold</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input className="pt-admin-inp pt-admin-mono" defaultValue="70" type="number" style={{ width: 80 }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>%</span>
                    </div>
                  </div>
                  {([["Allow retry", true], ["Show correct answers after submit", true], ["Randomize question order", false], ["Time limit", false]] as const).map(([l, on]) => (
                    <div key={l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--g100)" }}>
                      <span style={{ fontSize: 12 }}>{l}</span>
                      <Toggle on={on} />
                    </div>
                  ))}
                </div>
                <div className="pt-admin-card">
                  <div className="pt-admin-card-label">RESULTS</div>
                  <div style={{ padding: "12px 0", textAlign: "center", color: "var(--g400)", fontSize: 12 }}>
                    Quiz results will appear here once students start taking the quiz.
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════ LESSON PREVIEW ═══════════ */}
      {screen === "lesson-preview" && currentLesson && (
        <>
          <Bc items={[{ l: "Academy", onClick: goOverview }, { l: currentLesson.title }]} />
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            {currentLesson.bunny_video_id ? (
              <div style={{ position: "relative", paddingTop: "56.25%", marginBottom: 16, borderRadius: 14, overflow: "hidden", background: "#0f172a", border: "2px solid var(--black)" }}>
                <iframe
                  src={`https://iframe.mediadelivery.net/embed/${process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID}/${currentLesson.bunny_video_id}?autoplay=false&preload=true`}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              </div>
            ) : (
              <div style={{ width: "100%", aspectRatio: "16/9", background: "#0f172a", border: "2px solid var(--black)", borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--lime)", display: "flex", alignItems: "center", justifyContent: "center" }}><I.Play s={22} /></div>
                <div style={{ color: "#fff", fontSize: 13 }}>Preview: {currentLesson.title}</div>
              </div>
            )}
            <div style={{ fontSize: 22, fontWeight: 800 }}>{currentLesson.title}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, marginBottom: 16 }}>
              {courseDetail?.instructor && <Av name={courseDetail.instructor.avatar_text} color={courseDetail.instructor.avatar_color} size={30} />}
              <span style={{ fontSize: 13, fontWeight: 700 }}>{courseDetail?.instructor?.name || "Instructor"}</span>
              <span className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>{currentLesson.duration_text}</span>
              <span style={{ color: levelColor[courseDetail?.level || "beginner"], fontSize: 12, fontWeight: 600 }}>{courseDetail?.level}</span>
            </div>
            <button className="pt-admin-btn blk" style={{ marginBottom: 20 }}>Enroll Now</button>
            <div style={{ fontSize: 14, color: "var(--g600)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {currentLesson.content || "No description yet."}
            </div>
          </div>
        </>
      )}

      {/* ═══════════ LESSON ANALYTICS ═══════════ */}
      {screen === "lesson-analytics" && currentLesson && (
        <>
          <Bc items={[{ l: "Academy", onClick: goOverview }, { l: courseDetail?.title || "Course", onClick: goBack }, { l: `${currentLesson.title} — Analytics` }]} />
          <div className="pt-admin-stats">
            {[["Views", "2,841"], ["Completions", "2,124"], ["Completion Rate", "74.8%"], ["Avg Watch Time", "10:24 / 12:00"]].map(([l, v]) => (
              <div key={l} className="pt-admin-stat" style={{ cursor: "default" }}>
                <div className="pt-admin-stat-label">{(l as string).toUpperCase()}</div>
                <div className="pt-admin-stat-value">{v}</div>
              </div>
            ))}
          </div>
          <div className="pt-admin-analytics-grid2">
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">WATCH RETENTION CURVE</div>
              <div style={{ height: 120, display: "flex", alignItems: "flex-end", gap: 2 }}>
                {[100, 98, 96, 94, 92, 90, 88, 85, 82, 78, 74, 70, 68, 65, 62, 60, 58, 55, 52, 50].map((v, i) => (
                  <div key={i} style={{ flex: 1, height: `${v}%`, background: v > 70 ? "var(--lime)" : v > 50 ? "#f59e0b" : "#ef4444", borderRadius: "2px 2px 0 0", border: "1px solid rgba(0,0,0,.08)" }} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span className="pt-admin-mono" style={{ fontSize: 9, color: "var(--g400)" }}>0:00</span>
                <span className="pt-admin-mono" style={{ fontSize: 9, color: "var(--g400)" }}>6:00</span>
                <span className="pt-admin-mono" style={{ fontSize: 9, color: "var(--g400)" }}>12:00</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--g400)", marginTop: 8 }}>Biggest drop-off at <strong style={{ color: "#dc2626" }}>8:30</strong> — consider restructuring this section</div>
            </div>
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">QUIZ PERFORMANCE</div>
              {[["Q1: Max daily loss limit?", "88%", "#22c55e"], ["Q2: Not a common rule?", "64%", "#f59e0b"], ["Q3: What does R:R stand for?", "92%", "#22c55e"]].map(([q, p, c]) => (
                <div key={q} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 12, maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q}</span>
                    <span className="pt-admin-mono" style={{ fontSize: 11, fontWeight: 700, color: c as string }}>{p}</span>
                  </div>
                  <div style={{ height: 5, background: "var(--g100)", borderRadius: 99 }}>
                    <div style={{ height: "100%", width: p as string, background: c as string, borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ═══════════ INSTRUCTORS LIST ═══════════ */}
      {screen === "instructors" && (
        <>
          <Bc items={[{ l: "Academy", onClick: goOverview }, { l: "Instructors" }]} />
          {(instructors as Array<Record<string, unknown>> | undefined)?.map(inst => (
            <div key={inst.id as string} className="pt-admin-course-card" onClick={() => nav("instructor-profile", { instructorId: inst.id as string })}>
              <Av name={String(inst.avatar_text || "??")} color={inst.avatar_color as string} size={38} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{String(inst.name)}</div>
                <div className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>{String(inst.email || inst.role || "")}</div>
              </div>
              <div style={{ textAlign: "center", padding: "0 12px" }}>
                <div className="pt-admin-mono" style={{ fontSize: 14, fontWeight: 700 }}>{String(inst.courses_count || 0)}</div>
                <div className="pt-admin-mono" style={{ fontSize: 9, color: "var(--g400)" }}>courses</div>
              </div>
              <div style={{ textAlign: "center", padding: "0 12px" }}>
                <div className="pt-admin-mono" style={{ fontSize: 14, fontWeight: 700 }}>{Number(inst.students_count || 0).toLocaleString()}</div>
                <div className="pt-admin-mono" style={{ fontSize: 9, color: "var(--g400)" }}>students</div>
              </div>
              <div style={{ textAlign: "center", padding: "0 12px" }}>
                <div className="pt-admin-mono" style={{ fontSize: 14, fontWeight: 700 }}>{inst.rating ? `${inst.rating}` : "—"}</div>
                <div className="pt-admin-mono" style={{ fontSize: 9, color: "var(--g400)" }}>rating</div>
              </div>
              <span className={`pt-admin-badge ${String(inst.status || "active") === "active" ? "green" : "gray"}`}>
                {String(inst.status || "active")}
              </span>
            </div>
          ))}
        </>
      )}

      {/* ═══════════ INSTRUCTOR PROFILE ═══════════ */}
      {screen === "instructor-profile" && currentInstructor && (
        <>
          <Bc items={[{ l: "Academy", onClick: goOverview }, { l: "Instructors", onClick: goBack }, { l: String(currentInstructor.name) }]} />
          <div className="pt-admin-analytics-grid23">
            <div>
              <div className="pt-admin-card" style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <Av name={String(currentInstructor.avatar_text || "??")} color={currentInstructor.avatar_color as string} size={56} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{String(currentInstructor.name)}</div>
                    <div className="pt-admin-mono" style={{ fontSize: 11, color: "var(--g400)" }}>{String(currentInstructor.email || "")} · {String(currentInstructor.role || "")}</div>
                  </div>
                  <span className={`pt-admin-badge ${String(currentInstructor.status || "active") === "active" ? "green" : "gray"}`}>
                    {String(currentInstructor.status || "active")}
                  </span>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Bio</label>
                  <textarea className="pt-admin-inp" rows={3} defaultValue={String(currentInstructor.bio || "")} style={{ resize: "vertical" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Twitter</label>
                    <input className="pt-admin-inp" defaultValue={String(currentInstructor.twitter_handle || "")} placeholder="@handle" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>YouTube</label>
                    <input className="pt-admin-inp" defaultValue={String(currentInstructor.youtube_handle || "")} placeholder="Channel" />
                  </div>
                </div>
              </div>
              <div className="pt-admin-card">
                <div className="pt-admin-card-label">THEIR COURSES</div>
                {(courses as Array<Record<string, unknown>> | undefined)?.filter(c => c.instructor_id === currentInstructor.id).map(c => (
                  <div key={c.id as string} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--g100)", cursor: "pointer" }} onClick={() => goEdit(c.id as string)}>
                    <div style={{ width: 4, height: 32, borderRadius: 2, background: c.thumbnail_color as string }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{String(c.title)}</div>
                      <div className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>{Number(c.students_count || 0).toLocaleString()} students · {String(c.level)}</div>
                    </div>
                    <span className={`pt-admin-badge ${String(c.status) === "published" ? "green" : "gray"}`}>{String(c.status)}</span>
                  </div>
                ))}
                {!(courses as Array<Record<string, unknown>> | undefined)?.some(c => c.instructor_id === currentInstructor.id) && (
                  <div style={{ fontSize: 13, color: "var(--g400)", padding: 14, textAlign: "center" }}>No courses yet</div>
                )}
              </div>
            </div>
            <div>
              <div className="pt-admin-stats" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {[["Students", Number(currentInstructor.students_count || 0).toLocaleString()], ["Rating", currentInstructor.rating ? `${currentInstructor.rating}` : "—"], ["Courses", String(currentInstructor.courses_count || 0)], ["Earnings", "$0"]].map(([l, v]) => (
                  <div key={l} className="pt-admin-stat" style={{ cursor: "default" }}>
                    <div className="pt-admin-stat-label">{(l as string).toUpperCase()}</div>
                    <div className="pt-admin-stat-value" style={{ fontSize: 22 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="pt-admin-card" style={{ marginBottom: 14 }}>
                <div className="pt-admin-card-label">PERMISSIONS</div>
                {([["Can create courses", true], ["Can publish courses", true], ["Can manage own students", true], ["Can view all analytics", false], ["Can manage other instructors", false]] as const).map(([l, on]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--g100)" }}>
                    <span style={{ fontSize: 12 }}>{l}</span>
                    <Toggle on={on} />
                  </div>
                ))}
              </div>
              <div className="pt-admin-card">
                <div className="pt-admin-card-label">REVENUE SPLIT</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <input className="pt-admin-inp pt-admin-mono" defaultValue={String(currentInstructor.revenue_split || 65)} type="number" style={{ width: 70, fontSize: 18, fontWeight: 700, textAlign: "center" }} />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>%</span>
                  <span style={{ fontSize: 12, color: "var(--g400)" }}>to instructor</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--g400)" }}>Propian keeps {100 - Number(currentInstructor.revenue_split || 65)}% · Applies to all course sales</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════ ADD INSTRUCTOR ═══════════ */}
      {screen === "add-instructor" && (() => {
        const colors = ["#a8ff39", "#ff6b6b", "#4ecdc4", "#ffe66d", "#a78bfa", "#f472b6", "#38bdf8", "#fb923c"];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        return (
        <>
          <Bc items={[{ l: "Academy", onClick: goOverview }, { l: "Instructors", onClick: goBack }, { l: "Create" }]} />
          <div style={{ maxWidth: 560 }}>
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">CREATE INSTRUCTOR PROFILE</div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Full Name *</label>
                <input className="pt-admin-inp" placeholder="e.g. David Okonkwo" id="inst-name" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Handle *</label>
                <input className="pt-admin-inp pt-admin-mono" placeholder="e.g. david-okonkwo" id="inst-handle" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Role / Title *</label>
                <input className="pt-admin-inp" placeholder="e.g. Senior Prop Trader" id="inst-role" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Specialization</label>
                <input className="pt-admin-inp" placeholder="e.g. Crypto trading, Risk management" id="inst-spec" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Bio</label>
                <textarea className="pt-admin-inp" rows={3} placeholder="Short bio..." id="inst-bio" style={{ resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                <button className="pt-admin-btn blk" onClick={() => {
                  const name = (document.getElementById("inst-name") as HTMLInputElement)?.value?.trim();
                  const handle = (document.getElementById("inst-handle") as HTMLInputElement)?.value?.trim();
                  const role = (document.getElementById("inst-role") as HTMLInputElement)?.value?.trim();
                  const spec = (document.getElementById("inst-spec") as HTMLInputElement)?.value?.trim();
                  const bio = (document.getElementById("inst-bio") as HTMLTextAreaElement)?.value?.trim();
                  if (!name || !handle || !role) return;
                  const avatar_text = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                  createInstructor.mutate({ name, handle, avatar_text, avatar_color: randomColor, role, bio: bio || undefined, specialization: spec || undefined }, { onSuccess: () => goBack() });
                }}><I.Check s={14} /> Create Instructor</button>
                <button className="pt-admin-btn" onClick={goBack}>Cancel</button>
              </div>
            </div>
          </div>
        </>
        );
      })()}

      {/* ═══════════ STUDENT PROFILE ═══════════ */}
      {screen === "student-profile" && currentStudent && (
        <>
          <Bc items={[{ l: "Academy", onClick: goOverview }, { l: currentStudent.display_name || currentStudent.username || "Student" }]} />
          <div className="pt-admin-analytics-grid23">
            <div className="pt-admin-card">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <Av name={(currentStudent.display_name || currentStudent.username || "??").slice(0, 2).toUpperCase()} size={48} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{currentStudent.display_name || currentStudent.username}</div>
                  <div className="pt-admin-mono" style={{ fontSize: 11, color: "var(--g400)" }}>Student</div>
                </div>
              </div>
              <div className="pt-admin-card-label">ENROLLED COURSES</div>
              {courses?.slice(0, 3).map((c: Record<string, unknown>) => {
                const pct = Math.floor(Math.random() * 60) + 30;
                return (
                  <div key={c.id as string} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--g100)" }}>
                    <div style={{ width: 4, height: 28, borderRadius: 2, background: c.thumbnail_color as string }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{String(c.title)}</div>
                      <div className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>{Number(c.lessons_count || 0)} lessons</div>
                    </div>
                    <div style={{ width: 80 }}>
                      <div style={{ height: 5, background: "var(--g100)", borderRadius: 99 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#22c55e" : "var(--lime)", borderRadius: 99 }} />
                      </div>
                    </div>
                    <span className="pt-admin-mono" style={{ fontSize: 11, fontWeight: 600, width: 36 }}>{pct}%</span>
                  </div>
                );
              })}
              <div className="pt-admin-card-label" style={{ marginTop: 14 }}>ACTIVITY TIMELINE</div>
              {[
                { t: "Completed Risk Management Mastery", d: "2 hours ago" },
                { t: "Earned certificate: Prop Trading Fundamentals", d: "1 day ago" },
                { t: "Started lesson: Position Sizing 101", d: "2 days ago" },
                { t: "Enrolled in Risk Management Mastery", d: "5 days ago" },
              ].map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--g100)" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--lime)", marginTop: 5, flexShrink: 0, border: "1px solid var(--black)" }} />
                  <div style={{ flex: 1, fontSize: 13 }}>{a.t}</div>
                  <span className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>{a.d}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="pt-admin-stats" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {[["Courses", "3"], ["Completed", "1"], ["Certificates", "1"], ["Streak", "14 days"]].map(([l, v]) => (
                  <div key={l} className="pt-admin-stat" style={{ cursor: "default" }}>
                    <div className="pt-admin-stat-label">{(l as string).toUpperCase()}</div>
                    <div className="pt-admin-stat-value" style={{ fontSize: 22 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="pt-admin-card">
                <div className="pt-admin-card-label">CERTIFICATES EARNED</div>
                {courses?.slice(0, 1).map((c: Record<string, unknown>) => (
                  <div key={c.id as string} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--g100)" }}>
                    <I.Award s={16} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{String(c.title)}</div>
                      <div className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>Issued Feb 2026</div>
                    </div>
                    <button className="pt-admin-btn-ghost"><I.Download s={13} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════ CERTIFICATES ═══════════ */}
      {screen === "certificates" && (
        <>
          <Bc items={[{ l: "Academy", onClick: goOverview }, { l: "Certificates" }]} />
          <div className="pt-admin-analytics-grid3" style={{ marginBottom: 14 }}>
            {[["Total Issued", "4,821"], ["This Month", "842"], ["Revoked", "12"]].map(([l, v]) => (
              <div key={l} className="pt-admin-stat" style={{ cursor: "default" }}>
                <div className="pt-admin-stat-label">{(l as string).toUpperCase()}</div>
                <div className="pt-admin-stat-value">{v}</div>
              </div>
            ))}
          </div>
          <div className="pt-admin-analytics-grid2">
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">CERTIFICATE TEMPLATE</div>
              <div style={{ width: "100%", aspectRatio: "1.6", background: "linear-gradient(135deg,#0f172a,#1e293b)", borderRadius: 12, border: "2px solid var(--black)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#fff", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--lime)", border: "2px solid var(--black)" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--lime)" }}>PROPIAN</span>
                </div>
                <div className="pt-admin-mono" style={{ fontSize: 8, letterSpacing: 3, color: "var(--lime)", fontWeight: 700 }}>CERTIFICATE OF COMPLETION</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Student Name</div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>has successfully completed</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--lime)" }}>Course Title</div>
                <div style={{ fontSize: 9, color: "#64748b", marginTop: 8 }}>Date · Instructor Signature</div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="pt-admin-btn sm"><I.Edit s={12} /> Customize</button>
                <button className="pt-admin-btn sm"><I.Eye s={12} /> Preview</button>
              </div>
            </div>
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">RECENTLY ISSUED</div>
              {[
                { s: "Tom Hartley", c: "Prop Trading Fundamentals", d: "Feb 22, 2026" },
                { s: "Carlos Ruiz", c: "Risk Management Mastery", d: "Feb 21, 2026" },
                { s: "Aisha Bello", c: "Prop Trading Fundamentals", d: "Feb 20, 2026" },
                { s: "Jake Mitchell", c: "Psychology of Trading", d: "Feb 19, 2026" },
                { s: "Priya Shah", c: "Advanced Gold Trading", d: "Feb 18, 2026" },
              ].map((cert, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--g100)" }}>
                  <I.Award s={16} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{cert.s}</div>
                    <div className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>{cert.c}</div>
                  </div>
                  <span className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>{cert.d}</span>
                  <button className="pt-admin-btn-ghost"><I.Download s={13} /></button>
                  <button className="pt-admin-btn-ghost" style={{ color: "#dc2626" }}><I.X s={13} /></button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ═══════════ PODCAST EDITOR ═══════════ */}
      {screen === "podcast-editor" && currentPodcast && (
        <>
          <Bc items={[{ l: "Academy", onClick: goOverview }, { l: "Podcasts", onClick: goBack }, { l: currentPodcast.title }]} />
          <div className="pt-admin-analytics-grid23">
            <div>
              <div className="pt-admin-card" style={{ marginBottom: 14 }}>
                <div className="pt-admin-card-label">AUDIO FILE</div>
                <div style={{ padding: 16, background: "#0f172a", borderRadius: 10, color: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
                  <button style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--lime)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><I.Play s={18} /></button>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 3, background: "rgba(255,255,255,.2)", borderRadius: 99 }}>
                      <div style={{ width: "35%", height: "100%", background: "var(--lime)", borderRadius: 99 }} />
                    </div>
                  </div>
                  <span className="pt-admin-mono" style={{ fontSize: 11, color: "#94a3b8" }}>14:52 / {currentPodcast.duration}</span>
                </div>
                <button className="pt-admin-btn sm" style={{ marginTop: 8 }}><I.Upload s={12} /> Replace Audio</button>
              </div>
              <div className="pt-admin-card">
                <div className="pt-admin-card-label">EPISODE DETAILS</div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Title</label>
                  <input className="pt-admin-inp" defaultValue={currentPodcast.title} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Guest</label>
                  <input className="pt-admin-inp" defaultValue={currentPodcast.guest || ""} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Show Notes</label>
                  <textarea className="pt-admin-inp" rows={5} defaultValue={currentPodcast.description || ""} placeholder="Episode description and show notes..." style={{ resize: "vertical" }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Timestamps / Chapters</label>
                  {[["0:00", "Introduction"], ["3:24", "Background & Journey"], ["12:45", "Strategy Breakdown"], ["28:00", "Q&A"], ["38:40", "Key Takeaways"]].map(([t, l]) => (
                    <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--g100)" }}>
                      <span className="pt-admin-mono" style={{ fontSize: 11, fontWeight: 600, color: "#3b82f6", width: 40 }}>{t}</span>
                      <input className="pt-admin-inp" defaultValue={l} style={{ flex: 1, fontSize: 12 }} />
                      <button className="pt-admin-btn-ghost"><I.Trash s={12} /></button>
                    </div>
                  ))}
                  <button className="pt-admin-btn sm" style={{ marginTop: 6 }}><I.Plus s={11} /> Add Chapter</button>
                </div>
              </div>
            </div>
            <div>
              <div className="pt-admin-card" style={{ marginBottom: 14 }}>
                <div className="pt-admin-card-label">PUBLISHING</div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Status</label>
                  <select className="pt-admin-inp" defaultValue={currentPodcast.status}>
                    <option value="published">Published</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                {currentPodcast.status === "scheduled" && (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Publish Date</label>
                    <input className="pt-admin-inp" type="date" />
                  </div>
                )}
              </div>
              {currentPodcast.plays_count > 0 && (
                <div className="pt-admin-card" style={{ marginBottom: 14 }}>
                  <div className="pt-admin-card-label">PERFORMANCE</div>
                  {[["Total Plays", `${(currentPodcast.plays_count / 1000).toFixed(1)}K`], ["Avg Listen", "32:18"], ["Completion", "68%"], ["Shares", "248"]].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--g100)" }}>
                      <span style={{ fontSize: 12 }}>{l}</span>
                      <span className="pt-admin-mono" style={{ fontSize: 12, fontWeight: 700 }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-admin-card">
                <div className="pt-admin-card-label">TRANSCRIPT</div>
                <div className="pt-admin-upload-zone">
                  <I.Upload s={18} />
                  <span style={{ fontWeight: 600 }}>Upload transcript</span>
                  <span style={{ fontSize: 10, color: "var(--g400)" }}>.srt, .vtt, or .txt</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════ PODCAST SETTINGS ═══════════ */}
      {screen === "podcast-settings" && (
        <>
          <Bc items={[{ l: "Academy", onClick: goOverview }, { l: "Podcast Settings" }]} />
          <div className="pt-admin-analytics-grid2">
            <div className="pt-admin-card">
              <div className="pt-admin-card-label">PODCAST INFO</div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Podcast Name</label>
                <input className="pt-admin-inp" defaultValue="Propian Podcast" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Description</label>
                <textarea className="pt-admin-inp" rows={3} defaultValue="Weekly conversations with top prop traders about strategy, mindset, and the business of funded trading." style={{ resize: "vertical" }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Category</label>
                <select className="pt-admin-inp"><option>Business / Investing</option><option>Education</option></select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Schedule</label>
                <select className="pt-admin-inp"><option>Weekly (Thursdays)</option><option>Bi-weekly</option><option>Monthly</option></select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>Cover Art</label>
                <div style={{ width: 120, height: 120, background: "#000", borderRadius: 12, border: "2px solid var(--black)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "var(--lime)", fontWeight: 800, fontSize: 14, textAlign: "center", lineHeight: 1.2 }}>PROPIAN<br />PODCAST</span>
                </div>
                <button className="pt-admin-btn sm" style={{ marginTop: 8 }}><I.Upload s={12} /> Change</button>
              </div>
            </div>
            <div>
              <div className="pt-admin-card" style={{ marginBottom: 14 }}>
                <div className="pt-admin-card-label">DISTRIBUTION</div>
                {([["RSS Feed", "propian.com/podcast/rss", true], ["Apple Podcasts", "Connected", true], ["Spotify", "Connected", true], ["Google Podcasts", "Not connected", false]] as const).map(([p, s, on]) => (
                  <div key={p} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--g100)" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p}</div>
                      <div className="pt-admin-mono" style={{ fontSize: 10, color: on ? "#16a34a" : "var(--g400)" }}>{s}</div>
                    </div>
                    {on ? <button className="pt-admin-btn sm"><I.Copy s={12} /> Copy</button> : <button className="pt-admin-btn sm lime">Connect</button>}
                  </div>
                ))}
              </div>
              <div className="pt-admin-card">
                <div className="pt-admin-card-label">STATS OVERVIEW</div>
                {[["Total Episodes", String(podcasts?.filter(p => p.status === "published").length ?? 0)], ["Total Plays", `${((podcasts?.reduce((s, p) => s + (p.plays_count || 0), 0) ?? 0) / 1000).toFixed(0)}K`], ["Subscribers", "8,420"], ["Avg Rating", "4.8"]].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--g100)" }}>
                    <span style={{ fontSize: 13 }}>{l}</span>
                    <span className="pt-admin-mono" style={{ fontSize: 13, fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════ LEARNING PATHS ═══════════ */}
      {screen === "learning-paths" && (
        <>
          <Bc items={[{ l: "Academy", onClick: goOverview }, { l: "Learning Paths" }]} />
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: "var(--g400)" }}>Learning paths</span>
            <button className="pt-admin-btn lime"><I.Plus s={14} /> New Path</button>
          </div>
          {[
            { id: 1, name: "Beginner to Funded", courseIds: courses?.slice(0, 3).map((c: Record<string, unknown>) => c.id as string) || [], students: 2841, status: "published" },
            { id: 2, name: "Gold Specialist", courseIds: courses?.slice(0, 2).map((c: Record<string, unknown>) => c.id as string) || [], students: 842, status: "published" },
            { id: 3, name: "Crypto Trader Path", courseIds: courses?.slice(0, 2).map((c: Record<string, unknown>) => c.id as string) || [], students: 0, status: "draft" },
          ].map(lp => (
            <div key={lp.id} className="pt-admin-card" style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <I.Layers s={20} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{lp.name}</div>
                  <div className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>{lp.courseIds.length} courses · {lp.students.toLocaleString()} students</div>
                </div>
                <span className={`pt-admin-badge ${lp.status === "published" ? "green" : "gray"}`}>{lp.status}</span>
                <button className="pt-admin-btn sm"><I.Edit s={12} /> Edit</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {lp.courseIds.map((cid, i) => {
                  const c = (courses as Array<Record<string, unknown>> | undefined)?.find(x => x.id === cid);
                  return c ? (
                    <span key={cid} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {i > 0 && <span style={{ color: "var(--g300)", fontSize: 16 }}>&rarr;</span>}
                      <span style={{ padding: "6px 14px", background: "var(--g50)", border: "1.5px solid var(--g200)", borderRadius: 8, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 4, height: 16, borderRadius: 2, background: c.thumbnail_color as string }} /> {String(c.title)}
                      </span>
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ═══════════ COUPONS & PROMOTIONS ═══════════ */}
      {screen === "coupons" && (
        <>
          <Bc items={[{ l: "Academy", onClick: goOverview }, { l: "Coupons & Promotions" }]} />
          <div className="pt-admin-analytics-grid3" style={{ marginBottom: 14 }}>
            {[["Active Coupons", "3"], ["Total Redemptions", "4,632"], ["Revenue Impact", "-$8,420"]].map(([l, v]) => (
              <div key={l} className="pt-admin-stat" style={{ cursor: "default" }}>
                <div className="pt-admin-stat-label">{(l as string).toUpperCase()}</div>
                <div className="pt-admin-stat-value">{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: "var(--g400)" }}>4 coupons</span>
            <button className="pt-admin-btn lime"><I.Plus s={14} /> Create Coupon</button>
          </div>
          {[
            { id: 1, code: "LAUNCH20", discount: "20%", uses: 842, limit: 1000, expiry: "Mar 31, 2026", status: "active", courses: "All courses" },
            { id: 2, code: "FIRST10", discount: "$10", uses: 1204, limit: 0, expiry: "None", status: "active", courses: "All paid courses" },
            { id: 3, code: "GOLDMASTER", discount: "30%", uses: 186, limit: 500, expiry: "Apr 15, 2026", status: "active", courses: "Advanced Gold Trading" },
            { id: 4, code: "WELCOME50", discount: "50%", uses: 2400, limit: 2400, expiry: "Feb 1, 2026", status: "expired", courses: "All courses" },
          ].map(cp => (
            <div key={cp.id} className="pt-admin-course-card" style={{ cursor: "default" }}>
              <div className="pt-admin-mono" style={{ padding: "6px 14px", background: "var(--black)", color: "var(--lime)", borderRadius: 6, fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>{cp.code}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{cp.discount} off</div>
                <div className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)" }}>{cp.courses}</div>
              </div>
              <div style={{ textAlign: "center", padding: "0 12px" }}>
                <div className="pt-admin-mono" style={{ fontSize: 14, fontWeight: 700 }}>{cp.uses}{cp.limit > 0 ? `/${cp.limit}` : ""}</div>
                <div className="pt-admin-mono" style={{ fontSize: 9, color: "var(--g400)" }}>uses</div>
              </div>
              <div style={{ textAlign: "center", padding: "0 12px" }}>
                <div className="pt-admin-mono" style={{ fontSize: 11, color: "var(--g400)" }}>{cp.expiry}</div>
              </div>
              <span className={`pt-admin-badge ${cp.status === "active" ? "green" : cp.status === "expired" ? "red" : "gray"}`}>{cp.status}</span>
              <button className="pt-admin-btn sm"><I.Edit s={12} /></button>
              <button className="pt-admin-btn sm danger"><I.Trash s={12} /></button>
            </div>
          ))}
        </>
      )}

      {/* ═══════════ CONFIRM DELETE MODAL ═══════════ */}
      {confirmModal && (
        <div className="pt-admin-overlay" onClick={() => setConfirmModal(null)}>
          <div className="pt-admin-modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: "#dc2626" }}>
              Delete {confirmModal.type === "module" ? "Module" : confirmModal.type === "lesson" ? "Lesson" : confirmModal.type === "course" ? "Course" : "Podcast"}
            </div>
            <div style={{ fontSize: 13, color: "var(--g400)", marginBottom: 20 }}>
              This will permanently delete <strong style={{ color: "var(--black)" }}>{confirmModal.name}</strong>
              {confirmModal.type === "module" ? " and all its lessons" : confirmModal.type === "course" ? " including all modules, lessons and student data" : ""}. This action cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="pt-admin-btn danger" onClick={() => {
                if (confirmModal.type === "module") deleteModule.mutate({ moduleId: confirmModal.id, courseId: editCourseId! });
                else if (confirmModal.type === "lesson") deleteLesson.mutate({ lessonId: confirmModal.id, courseId: editCourseId! });
                else if (confirmModal.type === "course") deleteCourse.mutate(confirmModal.id, { onSuccess: goBack });
                else if (confirmModal.type === "podcast") deletePodcast.mutate(confirmModal.id);
                setConfirmModal(null);
              }}><I.Trash s={13} /> Delete</button>
              <button className="pt-admin-btn" onClick={() => setConfirmModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ VIDEO PICKER MODAL ═══════════ */}
      {showVideoPicker && (
        <div className="pt-admin-overlay" onClick={() => setShowVideoPicker(false)}>
          <div className="pt-admin-modal" onClick={e => e.stopPropagation()} style={{ minWidth: 560, maxWidth: 640 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Choose Video</h3>
              <button className="pt-admin-btn sm" onClick={() => setShowVideoPicker(false)} style={{ padding: "4px 8px" }}><I.X s={14} /></button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "2px solid var(--g100)" }}>
              {(["library", "upload"] as const).map(t => (
                <button key={t} onClick={() => setVideoPickerTab(t)} style={{ padding: "8px 16px", fontSize: 12, fontWeight: videoPickerTab === t ? 700 : 600, color: videoPickerTab === t ? "var(--black)" : "var(--g400)", background: "none", border: "none", cursor: "pointer", position: "relative", fontFamily: "var(--font)" }}>
                  {t === "library" ? "From Library" : "Upload New"}
                  {videoPickerTab === t && <div style={{ position: "absolute", bottom: -2, left: 8, right: 8, height: 2, background: "var(--lime)", borderRadius: "2px 2px 0 0" }} />}
                </button>
              ))}
            </div>

            {/* Library tab */}
            {videoPickerTab === "library" && (
              <div>
                {videoLibraryLoading ? (
                  <div style={{ padding: "40px 16px", textAlign: "center" }}>
                    <div className="pt-admin-spinner" style={{ margin: "0 auto 8px", borderColor: "var(--g200)", borderTopColor: "var(--black)" }} />
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--g400)" }}>Loading videos...</div>
                  </div>
                ) : videoLibrary && videoLibrary.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
                    {videoLibrary.map(video => (
                      <div key={video.guid} onClick={() => video.status >= 4 && selectVideoFromLibrary(video.guid)} style={{ borderRadius: 10, border: currentLesson?.bunny_video_id === video.guid ? "2px solid var(--lime)" : "1.5px solid var(--g200)", cursor: video.status >= 4 ? "pointer" : "not-allowed", opacity: video.status >= 4 ? 1 : 0.5, overflow: "hidden", transition: "border-color .15s" }} onMouseEnter={e => { if (video.status >= 4 && currentLesson?.bunny_video_id !== video.guid) (e.currentTarget as HTMLElement).style.borderColor = "var(--g300)"; }} onMouseLeave={e => { if (currentLesson?.bunny_video_id !== video.guid) (e.currentTarget as HTMLElement).style.borderColor = "var(--g200)"; }}>
                        <div style={{ aspectRatio: "16/9", background: video.thumbnailUrl ? `url(${video.thumbnailUrl}) center/cover` : "#0f172a", position: "relative" }}>
                          {video.status < 4 && (
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, fontWeight: 600, gap: 6 }}>
                              <div className="pt-admin-spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: "rgba(255,255,255,.3)", borderTopColor: "#fff" }} />
                              Processing {video.encodeProgress}%
                            </div>
                          )}
                          {currentLesson?.bunny_video_id === video.guid && (
                            <div style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "var(--lime)", border: "2px solid var(--black)", display: "flex", alignItems: "center", justifyContent: "center" }}><I.Check s={10} /></div>
                          )}
                          {video.length > 0 && (
                            <div className="pt-admin-mono" style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.75)", color: "#fff", fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4 }}>{formatDuration(video.length)}</div>
                          )}
                        </div>
                        <div style={{ padding: "8px 10px" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{video.title}</div>
                          <div className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g400)", marginTop: 2 }}>
                            {video.width > 0 ? video.width + "×" + video.height + " · " : ""}{new Date(video.dateUploaded).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--g400)" }}>
                    <I.Video s={28} />
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>No videos yet</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>Upload your first video to start building your library</div>
                    <button className="pt-admin-btn blk" style={{ marginTop: 12, fontSize: 12 }} onClick={() => setVideoPickerTab("upload")}><I.Upload s={13} /> Upload Now</button>
                  </div>
                )}
              </div>
            )}

            {/* Upload tab */}
            {videoPickerTab === "upload" && (
              <div>
                <div onClick={() => lessonVideoRef.current?.click()} style={{ border: "2px dashed var(--g200)", borderRadius: 12, padding: "40px 20px", textAlign: "center", cursor: "pointer", background: "var(--g50)", transition: "border-color .15s", aspectRatio: "16/9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--g400)"; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--g200)"; }}>
                  {uploadingLesson === editLessonId ? (
                    <>
                      <div className="pt-admin-spinner" style={{ margin: "0 auto 8px", borderColor: "var(--g200)", borderTopColor: "var(--black)" }} />
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Uploading... {uploadProgress}%</div>
                      <div style={{ width: "60%", height: 4, background: "var(--g100)", borderRadius: 99, marginTop: 10 }}>
                        <div style={{ height: "100%", width: uploadProgress + "%", background: "var(--lime)", borderRadius: 99, transition: "width .3s" }} />
                      </div>
                    </>
                  ) : (
                    <>
                      <I.Upload s={28} />
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>Click to upload video</div>
                      <div style={{ fontSize: 11, color: "var(--g400)", marginTop: 4 }}>MP4, MOV up to 2GB</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ THUMBNAIL PICKER MODAL ═══════════ */}
      {showThumbPicker && (
        <div className="pt-admin-overlay" onClick={() => setShowThumbPicker(false)}>
          <div className="pt-admin-modal" onClick={e => e.stopPropagation()} style={{ minWidth: 480, maxWidth: 560 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Choose Thumbnail</h3>
              <button className="pt-admin-btn sm" onClick={() => setShowThumbPicker(false)} style={{ padding: "4px 8px" }}><I.X s={14} /></button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "2px solid var(--g100)" }}>
              {(["library", "upload"] as const).map(t => (
                <button key={t} onClick={() => setThumbPickerTab(t)} style={{ padding: "8px 16px", fontSize: 12, fontWeight: thumbPickerTab === t ? 700 : 600, color: thumbPickerTab === t ? "var(--black)" : "var(--g400)", background: "none", border: "none", cursor: "pointer", position: "relative", fontFamily: "var(--font)" }}>
                  {t === "library" ? "From Library" : "Upload New"}
                  {thumbPickerTab === t && <div style={{ position: "absolute", bottom: -2, left: 8, right: 8, height: 2, background: "var(--lime)", borderRadius: "2px 2px 0 0" }} />}
                </button>
              ))}
            </div>

            {/* Library tab */}
            {thumbPickerTab === "library" && (
              <div>
                {thumbLibrary && thumbLibrary.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                    {thumbLibrary.map(url => (
                      <div key={url} onClick={() => selectFromLibrary(url)} style={{ aspectRatio: "16/9", borderRadius: 8, border: courseDetail?.thumbnail_url === url ? "2px solid var(--lime)" : "1.5px solid var(--g200)", background: `url(${url}) center/cover`, cursor: "pointer", position: "relative", overflow: "hidden", transition: "border-color .15s" }} onMouseEnter={e => { if (courseDetail?.thumbnail_url !== url) (e.currentTarget as HTMLElement).style.borderColor = "var(--g300)"; }} onMouseLeave={e => { if (courseDetail?.thumbnail_url !== url) (e.currentTarget as HTMLElement).style.borderColor = "var(--g200)"; }}>
                        {courseDetail?.thumbnail_url === url && (
                          <div style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "var(--lime)", border: "2px solid var(--black)", display: "flex", alignItems: "center", justifyContent: "center" }}><I.Check s={10} /></div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--g400)" }}>
                    <I.Layers s={28} />
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>No thumbnails yet</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>Upload your first thumbnail to start building your library</div>
                    <button className="pt-admin-btn blk" style={{ marginTop: 12, fontSize: 12 }} onClick={() => setThumbPickerTab("upload")}><I.Upload s={13} /> Upload Now</button>
                  </div>
                )}
              </div>
            )}

            {/* Upload tab */}
            {thumbPickerTab === "upload" && (
              <div>
                <input ref={thumbInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleThumbnailUpload(f); e.target.value = ""; }} />
                <div onClick={() => thumbInputRef.current?.click()} style={{ border: "2px dashed var(--g200)", borderRadius: 12, padding: "40px 20px", textAlign: "center", cursor: "pointer", background: "var(--g50)", transition: "border-color .15s" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--g400)"; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--g200)"; }}>
                  {thumbnailUploading ? (
                    <>
                      <div className="pt-admin-spinner" style={{ margin: "0 auto 8px", borderColor: "var(--g200)", borderTopColor: "var(--black)" }} />
                      <div style={{ fontSize: 12, fontWeight: 600 }}>Uploading...</div>
                    </>
                  ) : (
                    <>
                      <I.Upload s={28} />
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>Click to upload</div>
                      <div style={{ fontSize: 11, color: "var(--g400)", marginTop: 4 }}>PNG, JPG, or WebP · Max 10 MB</div>
                      <div className="pt-admin-mono" style={{ fontSize: 10, color: "var(--g300)", marginTop: 8 }}>Recommended: 1280 × 720 (16:9)</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ TOAST NOTIFICATION ═══════════ */}
      {toast && (
        <div
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 9999,
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 20px", borderRadius: 12,
            background: toast.type === "success" ? "var(--black)" : "#dc2626",
            color: "#fff", fontSize: 13, fontWeight: 600,
            boxShadow: "0 8px 32px rgba(0,0,0,.18)",
            border: toast.type === "success" ? "2px solid var(--lime)" : "2px solid #fca5a5",
            animation: "pt-admin-toast-in .25s ease-out",
          }}
        >
          {toast.type === "success" ? <I.Check s={16} /> : <I.X s={16} />}
          {toast.message}
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.6)", cursor: "pointer", marginLeft: 4, padding: 0 }}><I.X s={12} /></button>
        </div>
      )}

    </div>
  );
}
