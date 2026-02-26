"use client";

import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCourses,
  useCourse,
  useCourseModules,
  useCourseLessons,
  useQuizQuestions,
  useInstructors,
  useInstructor,
  useInstructorCourses,
  useInstructorReviews,
  useLearningPaths,
  useUserProgress,
  useUserCourseProgress,
  useUserLessonProgress,
  useUserCertificates,
  useUserNotes,
  useUserQuizAttempts,
  useEnrollCourse,
  useCompleteLesson,
  useSubmitQuiz,
  useSaveNote,
  useIssueCertificate,
  useLearningStats,
  useHasCoursePurchase,
  useUserSubscription,
  useCheckout,
} from "@propian/shared/hooks";
import type {
  AcademyView,
  Course,
  CourseLevel,
  CourseModule,
  Lesson,
  QuizQuestion,
  Instructor,
  LearningPath,
  Certificate,
  UserLessonProgress,
} from "@propian/shared/types";
import { createBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

/* ─── Constants ─── */

const LEVEL_COLORS: Record<CourseLevel, string> = {
  beginner: "var(--green)",
  intermediate: "var(--amber, #ffaa00)",
  advanced: "var(--red)",
};

const LEVEL_LABELS: { label: string; value: CourseLevel | "all" }[] = [
  { label: "All Courses", value: "all" },
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

const COURSE_TABS = ["Curriculum", "Overview", "Reviews", "Resources"] as const;

/* ─── Streak helpers ─── */

/** Build weekly view based on actual activity dates */
function getStreakDays(activityDates: string[]): { label: string; status: "done" | "today" | "upcoming" }[] {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const today = new Date();
  const dayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1; // Mon=0

  // Get the start of the current week (Monday)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayIndex);
  weekStart.setHours(0, 0, 0, 0);

  const activitySet = new Set(activityDates);

  return days.map((d, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    if (i > dayIndex) return { label: d, status: "upcoming" as const };
    if (i === dayIndex) {
      return { label: d, status: activitySet.has(dateStr) ? "done" as const : "today" as const };
    }
    // Past day — green if activity happened, gray otherwise
    return { label: d, status: activitySet.has(dateStr) ? "done" as const : "upcoming" as const };
  });
}

/** Compute consecutive-day streak from sorted activity dates */
function computeStreak(activityDates: string[]): number {
  if (!activityDates.length) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Unique sorted dates descending
  const dates = [...new Set(activityDates)]
    .map((d) => { const dt = new Date(d); dt.setHours(0, 0, 0, 0); return dt; })
    .sort((a, b) => b.getTime() - a.getTime());

  // Most recent activity must be today or yesterday
  const mostRecent = dates[0];
  const diffDays = Math.round((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 1) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const gap = Math.round((dates[i - 1].getTime() - dates[i].getTime()) / (1000 * 60 * 60 * 24));
    if (gap === 1) streak++;
    else if (gap === 0) continue; // duplicate
    else break;
  }
  return streak;
}

/* ─── Sub-components ─── */

function LoadingSkeleton() {
  return (
    <div className="pt-col" style={{ gap: 16 }}>
      <Skeleton width="100%" height={120} borderRadius={16} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={340} borderRadius={16} />
        ))}
      </div>
    </div>
  );
}

function CourseCard({
  course,
  progressPct,
  onClick,
}: {
  course: Course;
  progressPct?: number;
  onClick: () => void;
}) {
  return (
    <div className="pt-course-card" onClick={onClick} style={{ cursor: "pointer" }}>
      <div
        className="pt-course-thumb"
        style={{ background: course.thumbnail_url ? `url(${course.thumbnail_url}) center/cover` : course.thumbnail_color }}
      >
        {!course.thumbnail_url && (
          <div
            className="pt-course-thumb-pattern"
            style={{
              background: `repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(255,255,255,0.1) 8px, rgba(255,255,255,0.1) 16px)`,
            }}
          />
        )}
        <div className="pt-course-play">▶</div>
      </div>
      <div className="pt-course-body">
        <div className="pt-course-meta">
          <span className="pt-badge" style={{ color: LEVEL_COLORS[course.level] }}>
            {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
          </span>
          <span className="pt-badge">{course.lessons_count} lessons</span>
          <span className="pt-badge">{course.duration_text}</span>
        </div>
        <div className="pt-course-title">{course.title}</div>
        <div className="pt-course-desc">{course.description}</div>
        <div className="pt-course-footer">
          <div className="pt-course-instructor">
            <Avatar
              name={course.instructor?.name ?? ""}
              size="sm"
            />
            <span>{course.instructor?.name}</span>
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: course.price === "Free" ? "var(--green)" : "var(--g900)",
            }}
          >
            {course.price}
          </span>
        </div>
        {progressPct != null && progressPct > 0 && (
          <>
            <div className="pt-course-progress">
              <div
                className="pt-course-progress-bar"
                style={{
                  width: `${progressPct}%`,
                  background:
                    progressPct >= 100 ? "var(--green)" : "var(--lime)",
                }}
              />
            </div>
            <div className="pt-course-progress-label">
              <span>{progressPct}% complete</span>
              <span>{course.lessons_count} lessons</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InstructorCard({
  instructor,
  onClick,
}: {
  instructor: Instructor;
  onClick: () => void;
}) {
  return (
    <div className="pt-instructor" onClick={onClick} style={{ cursor: "pointer" }}>
      <Avatar
        name={instructor.name}
        size="lg"
      />
      <div className="pt-instructor-info">
        <div className="pt-instructor-name">
          {instructor.name}
          {instructor.is_verified && (
            <span style={{ color: "var(--lime)", fontSize: 14 }}>✓</span>
          )}
        </div>
        <div className="pt-instructor-role">{instructor.role}</div>
        <div className="pt-instructor-stats">
          <div className="pt-instructor-stat">
            📚 {instructor.courses_count ?? 0} courses
          </div>
          <div className="pt-instructor-stat">
            👥 {instructor.students_count?.toLocaleString() ?? 0} students
          </div>
          <div className="pt-instructor-stat">
            ⭐ {instructor.rating_avg ?? 0}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */

export default function AcademyPage() {
  const supabase = createBrowserClient();
  const qc = useQueryClient();

  /* ── Navigation state ── */
  const [view, setView] = useState<AcademyView>("catalog");
  const [selectedCourseSlug, setSelectedCourseSlug] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<CourseLevel | "all">("all");

  /* ── Handle Stripe redirect: ?payment=success ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      // Verify subscription directly with Stripe (fallback if webhook didn't fire)
      fetch("/api/stripe/verify-subscription", { method: "POST" })
        .then(() => {
          // Invalidate queries so purchase/subscription/enrollment data refreshes
          qc.invalidateQueries({ queryKey: ["academy-user-progress"] });
          qc.invalidateQueries({ queryKey: ["academy-subscription"] });
          qc.invalidateQueries({ queryKey: ["academy-purchases"] });
          qc.invalidateQueries({ queryKey: ["academy-courses"] });
          qc.invalidateQueries({ queryKey: ["profile"] });
        })
        .catch(() => {
          // Still invalidate queries even if verification fails
          qc.invalidateQueries({ queryKey: ["academy-subscription"] });
          qc.invalidateQueries({ queryKey: ["profile"] });
        });

      // Navigate to course if slug is in URL
      const courseSlug = params.get("course");
      if (courseSlug) {
        setSelectedCourseSlug(courseSlug);
        setView("course");
      }

      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [qc]);

  /* ── Data hooks ── */
  const { data: courses, isLoading: coursesLoading } = useCourses(
    supabase,
    levelFilter === "all" ? undefined : levelFilter,
  );
  const { data: instructors } = useInstructors(supabase);
  const { data: userProgress } = useUserProgress(supabase);
  const { data: certificates } = useUserCertificates(supabase);
  const { data: paths } = useLearningPaths(supabase);

  /* ── Progress map ── */
  const progressMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of userProgress ?? []) {
      map.set(p.course_id, p.progress_pct);
    }
    return map;
  }, [userProgress]);

  /* ── Navigation helpers ── */
  function goToCourse(slug: string) {
    setSelectedCourseSlug(slug);
    setView("course");
  }
  function goToLesson(lessonId: string) {
    setSelectedLessonId(lessonId);
    setView("lesson");
  }
  function goToQuiz(lessonId: string) {
    setSelectedLessonId(lessonId);
    setView("quiz");
  }
  function goToInstructor(id: string) {
    setSelectedInstructorId(id);
    setView("instructor");
  }
  function goBack() {
    if (view === "lesson" || view === "quiz") setView("course");
    else if (view === "course" || view === "instructor" || view === "path" || view === "certificates")
      setView("catalog");
    else setView("catalog");
  }

  /* ── Render ── */
  return (
    <div className="pt-container">
      {view === "catalog" && (
        <CatalogView
          supabase={supabase}
          courses={courses ?? []}
          instructors={instructors ?? []}
          paths={paths ?? []}
          certificates={certificates ?? []}
          userProgress={userProgress ?? []}
          progressMap={progressMap}
          isLoading={coursesLoading}
          levelFilter={levelFilter}
          setLevelFilter={setLevelFilter}
          onCourseClick={goToCourse}
          onInstructorClick={goToInstructor}
          onViewPaths={() => setView("path")}
          onViewCerts={() => setView("certificates")}
        />
      )}
      {view === "course" && selectedCourseSlug && (
        <CourseDetailView
          supabase={supabase}
          slug={selectedCourseSlug}
          onBack={goBack}
          onLessonClick={goToLesson}
          onQuizClick={goToQuiz}
          onInstructorClick={goToInstructor}
        />
      )}
      {view === "lesson" && selectedLessonId && selectedCourseSlug && (
        <LessonView
          supabase={supabase}
          lessonId={selectedLessonId}
          courseSlug={selectedCourseSlug}
          onBack={() => setView("course")}
          onLessonClick={goToLesson}
          onQuizClick={goToQuiz}
        />
      )}
      {view === "quiz" && selectedLessonId && selectedCourseSlug && (
        <QuizView
          supabase={supabase}
          lessonId={selectedLessonId}
          courseSlug={selectedCourseSlug}
          onBack={() => setView("course")}
        />
      )}
      {view === "path" && (
        <PathView
          paths={paths ?? []}
          progressMap={progressMap}
          onBack={goBack}
          onCourseClick={goToCourse}
        />
      )}
      {view === "certificates" && (
        <CertificatesView
          supabase={supabase}
          certificates={certificates ?? []}
          userProgress={userProgress ?? []}
          onBack={goBack}
          onCourseClick={goToCourse}
        />
      )}
      {view === "instructor" && selectedInstructorId && (
        <InstructorProfileView
          supabase={supabase}
          instructorId={selectedInstructorId}
          progressMap={progressMap}
          onBack={goBack}
          onCourseClick={goToCourse}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   CATALOG VIEW
   ═══════════════════════════════════════════════════ */

function CatalogView({
  supabase,
  courses,
  instructors,
  paths,
  certificates,
  userProgress,
  progressMap,
  isLoading,
  levelFilter,
  setLevelFilter,
  onCourseClick,
  onInstructorClick,
  onViewPaths,
  onViewCerts,
}: {
  supabase: ReturnType<typeof createBrowserClient>;
  courses: Course[];
  instructors: Instructor[];
  paths: LearningPath[];
  certificates: Certificate[];
  userProgress: { progress_pct: number; completed_at: string | null }[];
  progressMap: Map<string, number>;
  isLoading: boolean;
  levelFilter: CourseLevel | "all";
  setLevelFilter: (v: CourseLevel | "all") => void;
  onCourseClick: (slug: string) => void;
  onInstructorClick: (id: string) => void;
  onViewPaths: () => void;
  onViewCerts: () => void;
}) {
  const { data: learningStats } = useLearningStats(supabase);
  const activityDates = learningStats?.activityDates ?? [];
  const streakDays = getStreakDays(activityDates);
  const completed = userProgress.filter((p) => p.completed_at).length;
  const hoursLearned = Math.round((learningStats?.totalMinutes ?? 0) / 60 * 10) / 10;
  const streak = computeStreak(activityDates);

  return (
    <>
      <div className="pt-page-header">
        <h1 className="pt-page-title">Academy</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="pt-btn pt-btn-sm" onClick={onViewPaths}>
            Learning Paths
          </button>
          <button className="pt-btn pt-btn-sm" onClick={onViewCerts}>
            My Certificates
          </button>
        </div>
      </div>

      {/* Stats + Streak */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 12, marginBottom: 24 }}>
        <div className="pt-card" style={{ padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--mono)" }}>{completed}</div>
          <div style={{ fontSize: 11, color: "var(--g400)", textTransform: "uppercase", letterSpacing: 1 }}>Courses Done</div>
        </div>
        <div className="pt-card" style={{ padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--mono)" }}>{hoursLearned}h</div>
          <div style={{ fontSize: 11, color: "var(--g400)", textTransform: "uppercase", letterSpacing: 1 }}>Hours Learned</div>
        </div>
        <div className="pt-card" style={{ padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--mono)" }}>{streak}</div>
          <div style={{ fontSize: 11, color: "var(--g400)", textTransform: "uppercase", letterSpacing: 1 }}>Day Streak</div>
        </div>
        <div className="pt-card" style={{ padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--mono)" }}>{certificates.length}</div>
          <div style={{ fontSize: 11, color: "var(--g400)", textTransform: "uppercase", letterSpacing: 1 }}>Certificates</div>
        </div>
        <div className="pt-streak-card" style={{ minWidth: 220 }}>
          <div className="pt-streak-num">{streak}</div>
          <div className="pt-streak-label">Day Streak</div>
          <div className="pt-streak-days">
            {streakDays.map((d, i) => (
              <div key={i} className={`pt-streak-day ${d.status}`}>
                {d.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Level filter */}
      <div className="pt-period-tabs" style={{ marginBottom: 20 }}>
        {LEVEL_LABELS.map((l) => (
          <button
            key={l.value}
            className={`pt-period-tab ${levelFilter === l.value ? "active" : ""}`}
            onClick={() => setLevelFilter(l.value)}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Course grid */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : !courses.length ? (
        <EmptyState
          title="No courses found"
          description="Try a different level filter."
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 20,
            marginBottom: 40,
          }}
        >
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              progressPct={progressMap.get(c.id)}
              onClick={() => onCourseClick(c.slug)}
            />
          ))}
        </div>
      )}

      {/* Featured Instructors — hidden for now, may revisit later */}
    </>
  );
}

/* ═══════════════════════════════════════════════════
   COURSE DETAIL VIEW
   ═══════════════════════════════════════════════════ */

function CourseDetailView({
  supabase,
  slug,
  onBack,
  onLessonClick,
  onQuizClick,
  onInstructorClick,
}: {
  supabase: ReturnType<typeof createBrowserClient>;
  slug: string;
  onBack: () => void;
  onLessonClick: (id: string) => void;
  onQuizClick: (id: string) => void;
  onInstructorClick: (id: string) => void;
}) {
  const { data: course, isLoading } = useCourse(supabase, slug);
  const { data: modules } = useCourseModules(supabase, course?.id ?? null);
  const { data: lessons } = useCourseLessons(supabase, course?.id ?? null);
  const { data: progress } = useUserCourseProgress(supabase, course?.id ?? null);
  const { data: lessonProgress } = useUserLessonProgress(supabase, course?.id ?? null);
  const { data: hasPurchased } = useHasCoursePurchase(supabase, course?.id ?? null);
  const { data: subscription } = useUserSubscription(supabase);
  const enrollMutation = useEnrollCourse(supabase);
  const checkoutMutation = useCheckout();
  const [courseTab, setCourseTab] = useState<(typeof COURSE_TABS)[number]>("Curriculum");

  const isProActive = subscription?.status === "active" || subscription?.status === "trialing";

  const completedLessons = useMemo(() => {
    const set = new Set<string>();
    for (const lp of lessonProgress ?? []) {
      if (lp.completed) set.add(lp.lesson_id);
    }
    return set;
  }, [lessonProgress]);

  const lessonsByModule = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    for (const l of lessons ?? []) {
      const arr = map.get(l.module_id) ?? [];
      arr.push(l);
      map.set(l.module_id, arr);
    }
    return map;
  }, [lessons]);

  if (isLoading || !course) {
    return (
      <div className="pt-col" style={{ gap: 12 }}>
        <Skeleton width="100%" height={400} borderRadius={16} />
        <Skeleton width={300} height={32} borderRadius={8} />
        <Skeleton width="100%" height={200} borderRadius={16} />
      </div>
    );
  }

  return (
    <>
      <button className="pt-btn pt-btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>
        ← Back to Academy
      </button>

      {/* Video player */}
      <div className="pt-video-player" style={{ marginBottom: 24 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: course.thumbnail_url ? `url(${course.thumbnail_url}) center/cover` : course.thumbnail_color,
            opacity: course.thumbnail_url ? 1 : 0.3,
          }}
        />
        <div className="pt-video-overlay">
          <div className="pt-video-big-play">▶</div>
          <div className="pt-video-title-overlay">Preview: {course.title}</div>
        </div>
        <div className="pt-video-controls">
          <button className="pt-video-ctrl-btn">▶</button>
          <div className="pt-video-progress">
            <div className="pt-video-progress-fill" style={{ width: "0%" }} />
          </div>
          <span className="pt-video-time">0:00 / {course.duration_text}</span>
        </div>
      </div>

      {/* Course header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginBottom: 8 }}>
          {course.title}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {course.instructor && (
            <div
              className="pt-course-instructor"
              onClick={() => onInstructorClick(course.instructor!.id)}
              style={{ cursor: "pointer" }}
            >
              <Avatar name={course.instructor.name} size="sm" />
              <span>{course.instructor.name}</span>
            </div>
          )}
          <span className="pt-badge">{course.lessons_count} lessons</span>
          <span className="pt-badge">{course.duration_text}</span>
          <span className="pt-badge">{course.students_count.toLocaleString()} students</span>
          <span className="pt-badge" style={{ color: LEVEL_COLORS[course.level] }}>
            {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
          </span>
        </div>

        {/* Enroll / Progress / Purchase */}
        <div style={{ marginTop: 16 }}>
          {progress ? (
            <div style={{ maxWidth: 400 }}>
              <div className="pt-course-progress">
                <div
                  className="pt-course-progress-bar"
                  style={{
                    width: `${progress.progress_pct}%`,
                    background: progress.progress_pct >= 100 ? "var(--green)" : "var(--lime)",
                  }}
                />
              </div>
              <div className="pt-course-progress-label">
                <span>{progress.progress_pct}% complete</span>
                <span>
                  {completedLessons.size}/{lessons?.length ?? 0} lessons
                </span>
              </div>
            </div>
          ) : course.price_type === "free" || !course.price_type ? (
            /* Free course — direct enroll */
            <button
              className="pt-btn pt-btn-primary"
              onClick={() => enrollMutation.mutate(course.id)}
              disabled={enrollMutation.isPending}
            >
              {enrollMutation.isPending ? "Enrolling..." : "Enroll Now — Free"}
            </button>
          ) : course.price_type === "one_time" ? (
            hasPurchased ? (
              /* Already purchased — enroll */
              <button
                className="pt-btn pt-btn-primary"
                onClick={() => enrollMutation.mutate(course.id)}
                disabled={enrollMutation.isPending}
              >
                {enrollMutation.isPending ? "Enrolling..." : "Start Course — Purchased ✓"}
              </button>
            ) : (
              /* One-time purchase */
              <button
                className="pt-btn pt-btn-primary"
                onClick={() => checkoutMutation.mutate({ courseId: course.id })}
                disabled={checkoutMutation.isPending}
                style={{ background: "var(--lime)", color: "var(--g900)" }}
              >
                {checkoutMutation.isPending ? "Redirecting..." : `Purchase — ${course.price}`}
              </button>
            )
          ) : course.price_type === "pro_only" ? (
            isProActive ? (
              /* Pro subscriber — direct enroll */
              <button
                className="pt-btn pt-btn-primary"
                onClick={() => enrollMutation.mutate(course.id)}
                disabled={enrollMutation.isPending}
              >
                {enrollMutation.isPending ? "Enrolling..." : "Enroll Now — Pro Member ✓"}
              </button>
            ) : (
              /* Not a Pro subscriber — subscribe */
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span className="pt-badge" style={{ color: "var(--lime)", fontSize: 12, width: "fit-content" }}>
                  Pro Only
                </span>
                <button
                  className="pt-btn pt-btn-primary"
                  onClick={() => checkoutMutation.mutate({ plan: "pro" })}
                  disabled={checkoutMutation.isPending}
                  style={{ background: "var(--lime)", color: "var(--g900)" }}
                >
                  {checkoutMutation.isPending ? "Redirecting..." : "Subscribe to Pro"}
                </button>
              </div>
            )
          ) : (
            /* Fallback */
            <button
              className="pt-btn pt-btn-primary"
              onClick={() => enrollMutation.mutate(course.id)}
              disabled={enrollMutation.isPending}
            >
              {enrollMutation.isPending ? "Enrolling..." : "Enroll Now"}
            </button>
          )}
          {checkoutMutation.isError && (
            <div style={{ marginTop: 8, color: "var(--red)", fontSize: 13 }}>
              {checkoutMutation.error?.message ?? "Payment failed. Please try again."}
            </div>
          )}
          {enrollMutation.isError && (
            <div style={{ marginTop: 8, color: "var(--red)", fontSize: 13 }}>
              {enrollMutation.error?.message === "PAYMENT_REQUIRED"
                ? "This course requires payment."
                : enrollMutation.error?.message === "PRO_SUBSCRIPTION_REQUIRED"
                  ? "This course requires a Pro subscription."
                  : enrollMutation.error?.message ?? "Failed to enroll."}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="pt-period-tabs" style={{ marginBottom: 20 }}>
        {COURSE_TABS.map((t) => (
          <button
            key={t}
            className={`pt-period-tab ${courseTab === t ? "active" : ""}`}
            onClick={() => setCourseTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {courseTab === "Curriculum" && (
        <div className="pt-curriculum">
          <div className="pt-curriculum-header">
            <span>Course Curriculum</span>
            <span style={{ fontSize: 12, color: "var(--g400)", fontWeight: 400 }}>
              {modules?.length ?? 0} modules · {lessons?.length ?? 0} lessons
            </span>
          </div>
          {(modules ?? []).map((mod, mi) => {
            const modLessons = lessonsByModule.get(mod.id) ?? [];
            return (
              <div key={mod.id} className="pt-curriculum-module">
                <div className="pt-curriculum-module-header">
                  <span className="module-num">{String(mi + 1).padStart(2, "0")}</span>
                  <span>{mod.title}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--g400)" }}>
                    {modLessons.length} lessons
                  </span>
                </div>
                {modLessons
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((lesson) => {
                    const isCompleted = completedLessons.has(lesson.id);
                    return (
                      <div
                        key={lesson.id}
                        className={`pt-lesson-item ${isCompleted ? "completed" : ""}`}
                        onClick={() =>
                          progress
                            ? lesson.type === "quiz"
                              ? onQuizClick(lesson.id)
                              : onLessonClick(lesson.id)
                            : undefined
                        }
                        style={{ cursor: progress ? "pointer" : "default", opacity: progress ? 1 : 0.6 }}
                      >
                        <div className="pt-lesson-check">
                          {isCompleted ? "✓" : ""}
                        </div>
                        <span className="pt-lesson-name">{lesson.title}</span>
                        <span
                          className="pt-lesson-type"
                          style={{
                            background:
                              lesson.type === "quiz"
                                ? "var(--lime-10, rgba(168,255,57,0.1))"
                                : lesson.type === "article"
                                  ? "var(--g100)"
                                  : "var(--g100)",
                            color:
                              lesson.type === "quiz"
                                ? "var(--g900)"
                                : "var(--g500)",
                          }}
                        >
                          {lesson.type}
                        </span>
                        <span className="pt-lesson-dur">{lesson.duration_text}</span>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      )}

      {courseTab === "Overview" && (
        <div className="pt-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>About this course</h3>
          <p style={{ fontSize: 14, color: "var(--g600)", lineHeight: 1.6 }}>
            {course.description}
          </p>
          <div style={{ marginTop: 20, display: "flex", gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--g400)", textTransform: "uppercase", letterSpacing: 1 }}>Level</div>
              <div style={{ fontWeight: 600, marginTop: 4 }}>{course.level.charAt(0).toUpperCase() + course.level.slice(1)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--g400)", textTransform: "uppercase", letterSpacing: 1 }}>Duration</div>
              <div style={{ fontWeight: 600, marginTop: 4 }}>{course.duration_text}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--g400)", textTransform: "uppercase", letterSpacing: 1 }}>Students</div>
              <div style={{ fontWeight: 600, marginTop: 4 }}>{course.students_count.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {courseTab === "Reviews" && (
        <EmptyState
          title="No reviews yet"
          description="Be the first to review this course after completing it."
        />
      )}

      {courseTab === "Resources" && (
        <EmptyState
          title="No resources yet"
          description="Resources will be added as the course content is updated."
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════
   LESSON VIEW
   ═══════════════════════════════════════════════════ */

function LessonView({
  supabase,
  lessonId,
  courseSlug,
  onBack,
  onLessonClick,
  onQuizClick,
}: {
  supabase: ReturnType<typeof createBrowserClient>;
  lessonId: string;
  courseSlug: string;
  onBack: () => void;
  onLessonClick: (id: string) => void;
  onQuizClick: (id: string) => void;
}) {
  const { data: course } = useCourse(supabase, courseSlug);
  const { data: modules } = useCourseModules(supabase, course?.id ?? null);
  const { data: lessons } = useCourseLessons(supabase, course?.id ?? null);
  const { data: lessonProgress } = useUserLessonProgress(supabase, course?.id ?? null);
  const { data: noteData } = useUserNotes(supabase, lessonId);
  const completeMutation = useCompleteLesson(supabase);
  const noteMutation = useSaveNote(supabase);
  const [noteText, setNoteText] = useState(noteData?.content ?? "");

  // Update note text when data loads
  const currentLesson = lessons?.find((l) => l.id === lessonId);
  const currentModule = modules?.find((m) => m.id === currentLesson?.module_id);

  const completedSet = useMemo(() => {
    const s = new Set<string>();
    for (const lp of lessonProgress ?? []) {
      if (lp.completed) s.add(lp.lesson_id);
    }
    return s;
  }, [lessonProgress]);

  const isCompleted = completedSet.has(lessonId);

  // Find prev/next lesson
  const sortedLessons = useMemo(
    () => [...(lessons ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [lessons],
  );
  const idx = sortedLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = idx > 0 ? sortedLessons[idx - 1] : null;
  const nextLesson = idx < sortedLessons.length - 1 ? sortedLessons[idx + 1] : null;

  if (!currentLesson || !course) {
    return <Skeleton width="100%" height={400} borderRadius={16} />;
  }

  return (
    <>
      <button className="pt-btn pt-btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>
        ← Back to {course.title}
      </button>

      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: "var(--g400)", marginBottom: 12 }}>
        {currentModule?.title} → <strong style={{ color: "var(--g700)" }}>{currentLesson.title}</strong>
      </div>

      {/* Video player */}
      {currentLesson.bunny_video_id ? (
        <div style={{ position: "relative", paddingTop: "56.25%", marginBottom: 24, borderRadius: 16, overflow: "hidden", background: "#0f172a" }}>
          <iframe
            src={`https://iframe.mediadelivery.net/embed/${process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID}/${currentLesson.bunny_video_id}?autoplay=false&preload=true&responsive=true`}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
            loading="lazy"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="pt-video-player" style={{ marginBottom: 24 }}>
          <div style={{ position: "absolute", inset: 0, background: course.thumbnail_url ? `url(${course.thumbnail_url}) center/cover` : course.thumbnail_color, opacity: course.thumbnail_url ? 1 : 0.2 }} />
          <div className="pt-video-overlay">
            <div className="pt-video-big-play">▶</div>
            <div className="pt-video-title-overlay">{currentLesson.title}</div>
          </div>
          <div className="pt-video-controls">
            <button className="pt-video-ctrl-btn">▶</button>
            <div className="pt-video-progress">
              <div className="pt-video-progress-fill" style={{ width: "0%" }} />
            </div>
            <span className="pt-video-time">0:00 / {currentLesson.duration_text}</span>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
        <div>
          {/* Lesson content */}
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{currentLesson.title}</h2>

          {/* Mark complete + Nav */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {!isCompleted && (
              <button
                className="pt-btn pt-btn-primary"
                onClick={() =>
                  completeMutation.mutate({ lessonId, courseId: course.id })
                }
                disabled={completeMutation.isPending}
              >
                {completeMutation.isPending ? "Saving..." : "✓ Mark Complete"}
              </button>
            )}
            {isCompleted && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--green)",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                ✓ Completed
              </span>
            )}
            <div style={{ flex: 1 }} />
            {prevLesson && (
              <button
                className="pt-btn pt-btn-sm"
                onClick={() =>
                  prevLesson.type === "quiz"
                    ? onQuizClick(prevLesson.id)
                    : onLessonClick(prevLesson.id)
                }
              >
                ← Previous
              </button>
            )}
            {nextLesson && (
              <button
                className="pt-btn pt-btn-sm"
                onClick={() =>
                  nextLesson.type === "quiz"
                    ? onQuizClick(nextLesson.id)
                    : onLessonClick(nextLesson.id)
                }
              >
                Next →
              </button>
            )}
          </div>

          {/* Notes */}
          <div className="pt-notes-area">
            <div className="pt-notes-header">
              <span>My Notes</span>
              <button
                className="pt-btn pt-btn-sm"
                onClick={() => noteMutation.mutate({ lessonId, content: noteText })}
                disabled={noteMutation.isPending}
              >
                {noteMutation.isPending ? "Saving..." : "Save"}
              </button>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Take notes while watching..."
              style={{
                width: "100%",
                minHeight: 120,
                border: "none",
                padding: 16,
                fontSize: 14,
                fontFamily: "inherit",
                resize: "vertical",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Sidebar curriculum */}
        <div className="pt-curriculum" style={{ maxHeight: 600, overflowY: "auto" }}>
          <div className="pt-curriculum-header">
            <span>Lessons</span>
          </div>
          {sortedLessons.map((l) => {
            const done = completedSet.has(l.id);
            const active = l.id === lessonId;
            return (
              <div
                key={l.id}
                className={`pt-lesson-item ${done ? "completed" : ""} ${active ? "active" : ""}`}
                onClick={() => (l.type === "quiz" ? onQuizClick(l.id) : onLessonClick(l.id))}
                style={{ cursor: "pointer", paddingLeft: 20 }}
              >
                <div className="pt-lesson-check">{done ? "✓" : active ? "▶" : ""}</div>
                <span className="pt-lesson-name">{l.title}</span>
                <span className="pt-lesson-dur">{l.duration_text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   QUIZ VIEW
   ═══════════════════════════════════════════════════ */

function QuizView({
  supabase,
  lessonId,
  courseSlug,
  onBack,
}: {
  supabase: ReturnType<typeof createBrowserClient>;
  lessonId: string;
  courseSlug: string;
  onBack: () => void;
}) {
  const { data: course } = useCourse(supabase, courseSlug);
  const { data: questions, isLoading } = useQuizQuestions(supabase, lessonId);
  const completeMutation = useCompleteLesson(supabase);
  const submitMutation = useSubmitQuiz(supabase);

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const qs = questions ?? [];
  const question = qs[currentQ];
  const selectedAnswer = answers[currentQ] ?? null;

  function selectOption(idx: number) {
    if (submitted) return;
    const newAnswers = [...answers];
    newAnswers[currentQ] = idx;
    setAnswers(newAnswers);
  }

  async function handleSubmitQuestion() {
    setSubmitted(true);
  }

  function handleNext() {
    if (currentQ < qs.length - 1) {
      setCurrentQ(currentQ + 1);
      setSubmitted(false);
    } else {
      // Submit full quiz
      const finalAnswers = answers.map((a) => a ?? -1);
      submitMutation.mutate(
        { lessonId, answers: finalAnswers },
        {
          onSuccess: () => {
            if (course) {
              completeMutation.mutate({ lessonId, courseId: course.id });
            }
            setShowResult(true);
          },
        },
      );
    }
  }

  if (isLoading || !qs.length) {
    return <Skeleton width="100%" height={300} borderRadius={16} />;
  }

  if (showResult && submitMutation.data) {
    const result = submitMutation.data;
    return (
      <>
        <button className="pt-btn pt-btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>
          ← Back to Course
        </button>
        <div className="pt-quiz-result">
          <div style={{ fontSize: 14, color: "var(--g400)", marginBottom: 8 }}>Quiz Complete</div>
          <div className={`pt-quiz-score ${result.passed ? "pass" : "fail"}`}>
            {result.score}%
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 12 }}>
            {result.passed ? "Congratulations! You passed!" : "Not quite. Review the material and try again."}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 20 }}>
            {qs.map((_, i) => {
              const userAnswer = answers[i] ?? -1;
              const correct = userAnswer === qs[i].correct_index;
              return (
                <div
                  key={i}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: correct ? "var(--green)" : "var(--red)",
                  }}
                />
              );
            })}
          </div>
          <button className="pt-btn pt-btn-primary" onClick={onBack} style={{ marginTop: 24 }}>
            Return to Course
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <button className="pt-btn pt-btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>
        ← Back to Course
      </button>

      <div style={{ fontSize: 13, color: "var(--g400)", marginBottom: 16 }}>
        Question {currentQ + 1} of {qs.length}
      </div>

      <div className="pt-quiz-card">
        <div className="pt-quiz-question">{question.question}</div>
        {question.options.map((opt, i) => {
          let cls = "";
          if (submitted) {
            if (i === question.correct_index) cls = "correct";
            else if (i === selectedAnswer && i !== question.correct_index) cls = "wrong";
          } else if (i === selectedAnswer) {
            cls = "selected";
          }
          return (
            <div
              key={i}
              className={`pt-quiz-option ${cls}`}
              onClick={() => selectOption(i)}
              style={{ cursor: submitted ? "default" : "pointer" }}
            >
              <div className="pt-quiz-radio" />
              <span>{opt}</span>
            </div>
          );
        })}

        {submitted && question.explanation && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: "var(--g50)",
              borderRadius: 12,
              fontSize: 14,
              color: "var(--g600)",
              lineHeight: 1.5,
            }}
          >
            <strong>Explanation:</strong> {question.explanation}
          </div>
        )}

        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          {!submitted ? (
            <button
              className="pt-btn pt-btn-primary"
              onClick={handleSubmitQuestion}
              disabled={selectedAnswer === null}
            >
              Submit Answer
            </button>
          ) : (
            <button className="pt-btn pt-btn-primary" onClick={handleNext}>
              {currentQ < qs.length - 1 ? "Next Question →" : "Finish Quiz"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   LEARNING PATH VIEW
   ═══════════════════════════════════════════════════ */

function PathView({
  paths,
  progressMap,
  onBack,
  onCourseClick,
}: {
  paths: LearningPath[];
  progressMap: Map<string, number>;
  onBack: () => void;
  onCourseClick: (slug: string) => void;
}) {
  return (
    <>
      <button className="pt-btn pt-btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>
        ← Back to Academy
      </button>
      <h1 className="pt-page-title" style={{ marginBottom: 24 }}>Learning Paths</h1>

      {paths.map((path) => (
        <div key={path.id} style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{path.title}</h2>
          <p style={{ fontSize: 14, color: "var(--g500)", marginBottom: 20 }}>{path.description}</p>

          <div className="pt-learning-path">
            {(path.courses ?? []).map((pc, i) => {
              const course = pc.course;
              if (!course) return null;
              const pct = progressMap.get(course.id) ?? 0;
              const isDone = pct >= 100;
              const prevDone = i === 0 || (progressMap.get(path.courses![i - 1]?.course?.id ?? "") ?? 0) >= 100;
              const isCurrent = !isDone && prevDone;
              const isLocked = !isDone && !isCurrent;

              return (
                <div key={pc.course_id} className="pt-path-step">
                  <div
                    className={`pt-path-dot ${isDone ? "done" : isCurrent ? "current" : "locked"}`}
                  >
                    {isDone ? "✓" : i + 1}
                  </div>
                  <div
                    className={`pt-path-card ${isLocked ? "locked" : ""}`}
                    onClick={() => !isLocked && onCourseClick(course.slug)}
                    style={{ cursor: isLocked ? "default" : "pointer" }}
                  >
                    <div className="pt-path-title">{course.title}</div>
                    <div className="pt-path-desc">
                      {course.lessons_count} lessons · {course.duration_text} ·{" "}
                      {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
                    </div>
                    {pct > 0 && (
                      <div className="pt-course-progress" style={{ marginTop: 8 }}>
                        <div
                          className="pt-course-progress-bar"
                          style={{ width: `${pct}%`, background: isDone ? "var(--green)" : "var(--lime)" }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

/* ═══════════════════════════════════════════════════
   CERTIFICATES VIEW
   ═══════════════════════════════════════════════════ */

function CertificatesView({
  supabase,
  certificates,
  userProgress,
  onBack,
  onCourseClick,
}: {
  supabase: ReturnType<typeof createBrowserClient>;
  certificates: Certificate[];
  userProgress: { course_id: string; progress_pct: number; course?: Course }[];
  onBack: () => void;
  onCourseClick: (slug: string) => void;
}) {
  const certMutation = useIssueCertificate(supabase);
  const inProgress = userProgress.filter(
    (p) => p.progress_pct > 0 && p.progress_pct < 100,
  );
  const completedNoCert = userProgress.filter(
    (p) =>
      p.progress_pct >= 100 &&
      !certificates.some((c) => c.course_id === p.course_id),
  );

  return (
    <>
      <button className="pt-btn pt-btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>
        ← Back to Academy
      </button>
      <h1 className="pt-page-title" style={{ marginBottom: 24 }}>My Certificates</h1>

      {/* Claim certificates for completed courses */}
      {completedNoCert.length > 0 && (
        <div
          className="pt-card"
          style={{
            padding: 20,
            marginBottom: 24,
            background: "var(--lime-10, rgba(168,255,57,0.1))",
            border: "2px solid var(--lime)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            You have {completedNoCert.length} unclaimed certificate{completedNoCert.length > 1 ? "s" : ""}!
          </div>
          {completedNoCert.map((p) => (
            <button
              key={p.course_id}
              className="pt-btn pt-btn-primary pt-btn-sm"
              onClick={() => certMutation.mutate(p.course_id)}
              disabled={certMutation.isPending}
              style={{ marginRight: 8 }}
            >
              Claim: {p.course?.title ?? "Course"}
            </button>
          ))}
        </div>
      )}

      {/* Earned certificates */}
      {certificates.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: 20,
            marginBottom: 40,
          }}
        >
          {certificates.map((cert) => (
            <div key={cert.id} className="pt-cert">
              <div className="pt-cert-icon">🏆</div>
              <div className="pt-cert-title">Certificate of Completion</div>
              <div className="pt-cert-course">{cert.course?.title}</div>
              <div className="pt-cert-border">
                <div style={{ fontSize: 12, color: "var(--g400)" }}>
                  This certifies completion of all course requirements
                </div>
              </div>
              <div className="pt-cert-meta">
                <span>📅 {new Date(cert.issued_at).toLocaleDateString()}</span>
                <span>🔑 {cert.certificate_code}</span>
                {cert.instructor && <span>👨‍🏫 {cert.instructor.name}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No certificates yet"
          description="Complete a course to earn your first certificate."
        />
      )}

      {/* In progress */}
      {inProgress.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>In Progress</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {inProgress.map((p) => (
              <div
                key={p.course_id}
                className="pt-card"
                style={{ padding: 16, cursor: "pointer" }}
                onClick={() => {
                  if (p.course?.slug) onCourseClick(p.course.slug);
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  {p.course?.title ?? "Course"}
                </div>
                <div className="pt-course-progress">
                  <div
                    className="pt-course-progress-bar"
                    style={{ width: `${p.progress_pct}%`, background: "var(--lime)" }}
                  />
                </div>
                <div className="pt-course-progress-label">
                  <span>{p.progress_pct}% complete</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════
   INSTRUCTOR PROFILE VIEW
   ═══════════════════════════════════════════════════ */

function InstructorProfileView({
  supabase,
  instructorId,
  progressMap,
  onBack,
  onCourseClick,
}: {
  supabase: ReturnType<typeof createBrowserClient>;
  instructorId: string;
  progressMap: Map<string, number>;
  onBack: () => void;
  onCourseClick: (slug: string) => void;
}) {
  const { data: instructor, isLoading } = useInstructor(supabase, instructorId);
  const { data: instrCourses } = useInstructorCourses(supabase, instructorId);
  const { data: reviews } = useInstructorReviews(supabase, instructorId);

  if (isLoading || !instructor) {
    return (
      <div className="pt-col" style={{ gap: 12 }}>
        <Skeleton width="100%" height={200} borderRadius={16} />
        <Skeleton width={200} height={32} borderRadius={8} />
      </div>
    );
  }

  // Rating breakdown
  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: (reviews ?? []).filter((r) => r.rating === star).length,
  }));
  const maxCount = Math.max(...ratingBreakdown.map((r) => r.count), 1);

  return (
    <>
      <button className="pt-btn pt-btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>
        ← Back to Academy
      </button>

      <div className="pt-instr-profile">
        {/* Banner */}
        <div className="pt-instr-banner" style={{ background: instructor.avatar_color }} />

        <div className="pt-instr-body">
          {/* Avatar */}
          <div className="pt-instr-avatar" style={{ background: instructor.avatar_color }}>
            {instructor.avatar_text}
          </div>

          {/* Name + handle */}
          <div className="pt-instr-top">
            <div>
              <div className="pt-instr-name">
                {instructor.name}
                {instructor.is_verified && (
                  <span style={{ color: "var(--lime)", fontSize: 16 }}>✓</span>
                )}
              </div>
              <div className="pt-instr-handle">@{instructor.handle}</div>
            </div>
          </div>

          {/* Bio */}
          {instructor.bio && <div className="pt-instr-bio">{instructor.bio}</div>}

          {/* Meta */}
          <div className="pt-instr-meta">
            {instructor.location && (
              <div className="pt-instr-meta-item">📍 {instructor.location}</div>
            )}
            {instructor.joined_date && (
              <div className="pt-instr-meta-item">
                📅 Joined {new Date(instructor.joined_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </div>
            )}
            {instructor.specialization && (
              <div className="pt-instr-meta-item">🎯 {instructor.specialization}</div>
            )}
          </div>

          {/* Numbers row */}
          <div className="pt-instr-numbers">
            <div className="pt-instr-num">
              <div className="pt-instr-num-val">{instructor.students_count?.toLocaleString() ?? 0}</div>
              <div className="pt-instr-num-label">Students</div>
            </div>
            <div className="pt-instr-num">
              <div className="pt-instr-num-val">{instructor.courses_count ?? 0}</div>
              <div className="pt-instr-num-label">Courses</div>
            </div>
            <div className="pt-instr-num">
              <div className="pt-instr-num-val">{instructor.rating_avg ?? 0}</div>
              <div className="pt-instr-num-label">Rating</div>
            </div>
            <div className="pt-instr-num">
              <div className="pt-instr-num-val">{instructor.review_count ?? 0}</div>
              <div className="pt-instr-num-label">Reviews</div>
            </div>
          </div>
        </div>
      </div>

      {/* Courses */}
      {(instrCourses ?? []).length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "24px 0 16px" }}>Courses</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 16,
            }}
          >
            {(instrCourses ?? []).map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                progressPct={progressMap.get(c.id)}
                onClick={() => onCourseClick(c.slug)}
              />
            ))}
          </div>
        </>
      )}

      {/* Rating breakdown + Reviews */}
      {(reviews ?? []).length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "24px 0 16px" }}>Reviews</h2>

          {/* Rating bars */}
          <div className="pt-card" style={{ padding: 20, marginBottom: 16 }}>
            {ratingBreakdown.map(({ star, count }) => (
              <div key={star} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 13, width: 20, textAlign: "right" }}>{star}★</span>
                <div style={{ flex: 1, height: 8, background: "var(--g100)", borderRadius: 4, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${(count / maxCount) * 100}%`,
                      height: "100%",
                      background: "var(--lime)",
                      borderRadius: 4,
                    }}
                  />
                </div>
                <span style={{ fontSize: 12, color: "var(--g400)", width: 24 }}>{count}</span>
              </div>
            ))}
          </div>

          {/* Review cards */}
          {(reviews ?? []).map((r) => (
            <div key={r.id} className="pt-instr-review">
              <Avatar
                name={r.user?.display_name ?? "User"}
                size="sm"
              />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {r.user?.display_name ?? "Anonymous"}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--lime)" }}>
                    {"★".repeat(r.rating)}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--g400)" }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {r.body && <div className="pt-instr-review-body">{r.body}</div>}
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
}
