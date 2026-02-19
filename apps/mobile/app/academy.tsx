import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  TextInput,
  Dimensions,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  useCourses,
  useCourse,
  useCourseModules,
  useCourseLessons,
  useQuizQuestions,
  useInstructors,
  useInstructor,
  useInstructorCourses,
  useLearningPaths,
  useUserProgress,
  useUserCourseProgress,
  useUserLessonProgress,
  useUserCertificates,
  useUserNotes,
  useEnrollCourse,
  useCompleteLesson,
  useSubmitQuiz,
  useSaveNote,
  useIssueCertificate,
} from "@propian/shared/hooks";
import type {
  Course,
  CourseLevel,
  CourseModule,
  Lesson,
  QuizQuestion,
  Instructor,
  LearningPath,
  Certificate,
} from "@propian/shared/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { Avatar } from "@/components/ui/Avatar";
import { IconArrow } from "@/components/icons/IconArrow";
import { colors, fontFamily, radii } from "@/theme";
import { supabase } from "@/lib/supabase";

const SCREEN_W = Dimensions.get("window").width;

/* ─── Constants ─── */

type MainTab = "courses" | "paths" | "certificates";
const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: "courses", label: "Courses" },
  { key: "paths", label: "Paths" },
  { key: "certificates", label: "Certificates" },
];

type DrillView = "none" | "course" | "lesson" | "quiz" | "instructor";

const LEVEL_COLORS: Record<CourseLevel, string> = {
  beginner: colors.green,
  intermediate: "#ffaa00",
  advanced: colors.red,
};

/* ─── Tab Pill ─── */

function TabPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.tabPill, active && s.tabPillActive] as ViewStyle[]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[s.tabPillText, active && s.tabPillTextActive] as TextStyle[]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ─── Badge ─── */

function MBadge({ label, color }: { label: string; color?: string }) {
  return (
    <View
      style={[
        s.badge,
        color ? { borderColor: color } : undefined,
      ] as ViewStyle[]}
    >
      <Text style={[s.badgeText, color ? { color } : undefined] as TextStyle[]}>
        {label}
      </Text>
    </View>
  );
}

/* ─── Main Screen ─── */

export default function AcademyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  /* ── Navigation state ── */
  const [tab, setTab] = useState<MainTab>("courses");
  const [drill, setDrill] = useState<DrillView>("none");
  const [selectedCourseSlug, setSelectedCourseSlug] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<CourseLevel | "all">("all");
  const [refreshing, setRefreshing] = useState(false);

  /* ── Data hooks ── */
  const coursesQuery = useCourses(
    supabase,
    levelFilter === "all" ? undefined : levelFilter,
  );
  const instructorsQuery = useInstructors(supabase);
  const progressQuery = useUserProgress(supabase);
  const certsQuery = useUserCertificates(supabase);
  const pathsQuery = useLearningPaths(supabase);

  const courses = coursesQuery.data ?? [];
  const instructors = instructorsQuery.data ?? [];
  const userProgress = progressQuery.data ?? [];
  const certificates = certsQuery.data ?? [];
  const paths = pathsQuery.data ?? [];

  const progressMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of userProgress) map.set(p.course_id, p.progress_pct);
    return map;
  }, [userProgress]);

  /* ── Refresh ── */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      coursesQuery.refetch(),
      instructorsQuery.refetch(),
      progressQuery.refetch(),
      certsQuery.refetch(),
      pathsQuery.refetch(),
    ]);
    setRefreshing(false);
  }, []);

  /* ── Navigation helpers ── */
  function goToCourse(slug: string) {
    setSelectedCourseSlug(slug);
    setDrill("course");
  }
  function goToLesson(id: string) {
    setSelectedLessonId(id);
    setDrill("lesson");
  }
  function goToQuiz(id: string) {
    setSelectedLessonId(id);
    setDrill("quiz");
  }
  function goToInstructor(id: string) {
    setSelectedInstructorId(id);
    setDrill("instructor");
  }
  function goBack() {
    if (drill === "lesson" || drill === "quiz") setDrill("course");
    else setDrill("none");
  }

  /* ── Render ── */
  return (
    <View style={[s.safe, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header as ViewStyle}>
        {drill !== "none" ? (
          <TouchableOpacity onPress={goBack} style={s.backBtn as ViewStyle}>
            <IconArrow size={20} color={colors.black} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn as ViewStyle}>
            <IconArrow size={20} color={colors.black} />
          </TouchableOpacity>
        )}
        <Text style={s.headerTitle as TextStyle}>
          {drill === "none"
            ? "Academy"
            : drill === "course"
              ? "Course"
              : drill === "lesson"
                ? "Lesson"
                : drill === "quiz"
                  ? "Quiz"
                  : "Instructor"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main tabs (when not drilling) */}
      {drill === "none" && (
        <View style={s.tabRow as ViewStyle}>
          {MAIN_TABS.map((t) => (
            <TabPill
              key={t.key}
              label={t.label}
              active={tab === t.key}
              onPress={() => setTab(t.key)}
            />
          ))}
        </View>
      )}

      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {drill === "none" && tab === "courses" && (
          <CoursesTab
            courses={courses}
            instructors={instructors}
            progressMap={progressMap}
            userProgress={userProgress}
            certificates={certificates}
            levelFilter={levelFilter}
            setLevelFilter={setLevelFilter}
            isLoading={coursesQuery.isLoading}
            onCourseClick={goToCourse}
            onInstructorClick={goToInstructor}
          />
        )}
        {drill === "none" && tab === "paths" && (
          <PathsTab
            paths={paths}
            progressMap={progressMap}
            onCourseClick={goToCourse}
          />
        )}
        {drill === "none" && tab === "certificates" && (
          <CertificatesTab
            certificates={certificates}
            userProgress={userProgress}
            onClaim={(courseId) => {}}
          />
        )}
        {drill === "course" && selectedCourseSlug && (
          <CourseDetailDrill
            slug={selectedCourseSlug}
            onLessonClick={goToLesson}
            onQuizClick={goToQuiz}
            onInstructorClick={goToInstructor}
          />
        )}
        {drill === "lesson" && selectedLessonId && selectedCourseSlug && (
          <LessonDrill
            lessonId={selectedLessonId}
            courseSlug={selectedCourseSlug}
            onLessonClick={goToLesson}
            onQuizClick={goToQuiz}
          />
        )}
        {drill === "quiz" && selectedLessonId && selectedCourseSlug && (
          <QuizDrill
            lessonId={selectedLessonId}
            courseSlug={selectedCourseSlug}
            onBack={() => setDrill("course")}
          />
        )}
        {drill === "instructor" && selectedInstructorId && (
          <InstructorDrill
            instructorId={selectedInstructorId}
            progressMap={progressMap}
            onCourseClick={goToCourse}
          />
        )}
      </ScrollView>
    </View>
  );
}

/* ═══════════════════════════════════════════════════
   COURSES TAB
   ═══════════════════════════════════════════════════ */

function CoursesTab({
  courses,
  instructors,
  progressMap,
  userProgress,
  certificates,
  levelFilter,
  setLevelFilter,
  isLoading,
  onCourseClick,
  onInstructorClick,
}: {
  courses: Course[];
  instructors: Instructor[];
  progressMap: Map<string, number>;
  userProgress: { completed_at: string | null }[];
  certificates: Certificate[];
  levelFilter: CourseLevel | "all";
  setLevelFilter: (v: CourseLevel | "all") => void;
  isLoading: boolean;
  onCourseClick: (slug: string) => void;
  onInstructorClick: (id: string) => void;
}) {
  const completed = userProgress.filter((p) => p.completed_at).length;
  const streakDays = ["M", "T", "W", "T", "F", "S", "S"];
  const today = new Date().getDay();
  const dayIdx = today === 0 ? 6 : today - 1;

  return (
    <>
      {/* Stats row */}
      <View style={s.statsRow as ViewStyle}>
        <View style={s.statCard as ViewStyle}>
          <Text style={s.statNum as TextStyle}>{completed}</Text>
          <Text style={s.statLabel as TextStyle}>Completed</Text>
        </View>
        <View style={s.statCard as ViewStyle}>
          <Text style={s.statNum as TextStyle}>{Math.round(completed * 4.5)}h</Text>
          <Text style={s.statLabel as TextStyle}>Hours</Text>
        </View>
        <View style={s.statCard as ViewStyle}>
          <Text style={s.statNum as TextStyle}>{dayIdx}</Text>
          <Text style={s.statLabel as TextStyle}>Streak</Text>
        </View>
        <View style={s.statCard as ViewStyle}>
          <Text style={s.statNum as TextStyle}>{certificates.length}</Text>
          <Text style={s.statLabel as TextStyle}>Certs</Text>
        </View>
      </View>

      {/* Streak card */}
      <View style={s.streakCard as ViewStyle}>
        <Text style={s.streakNum as TextStyle}>{dayIdx}</Text>
        <Text style={s.streakLabel as TextStyle}>Day Streak</Text>
        <View style={s.streakDays as ViewStyle}>
          {streakDays.map((d, i) => (
            <View
              key={i}
              style={[
                s.streakDay,
                i < dayIdx
                  ? s.streakDayDone
                  : i === dayIdx
                    ? s.streakDayToday
                    : s.streakDayUpcoming,
              ] as ViewStyle[]}
            >
              <Text
                style={[
                  s.streakDayText,
                  i < dayIdx
                    ? { color: colors.black }
                    : i === dayIdx
                      ? { color: colors.lime }
                      : { color: colors.g500 },
                ] as TextStyle[]}
              >
                {d}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Level filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
        contentContainerStyle={{ gap: 8 }}
      >
        {(["all", "beginner", "intermediate", "advanced"] as const).map((lv) => (
          <TabPill
            key={lv}
            label={lv === "all" ? "All" : lv.charAt(0).toUpperCase() + lv.slice(1)}
            active={levelFilter === lv}
            onPress={() => setLevelFilter(lv)}
          />
        ))}
      </ScrollView>

      {/* Course list */}
      {isLoading ? (
        <>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={200} radius={14} style={{ marginBottom: 12 }} />
          ))}
        </>
      ) : (
        courses.map((c) => (
          <MobileCourseCard
            key={c.id}
            course={c}
            progressPct={progressMap.get(c.id)}
            onPress={() => onCourseClick(c.slug)}
          />
        ))
      )}

      {/* Featured Instructors */}
      {instructors.length > 0 && (
        <>
          <Text style={s.sectionTitle as TextStyle}>Featured Instructors</Text>
          {instructors.map((inst) => (
            <TouchableOpacity
              key={inst.id}
              style={s.instructorRow as ViewStyle}
              onPress={() => onInstructorClick(inst.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  s.avatarCircle,
                  { backgroundColor: inst.avatar_color },
                ] as ViewStyle[]}
              >
                <Text style={s.avatarText as TextStyle}>{inst.avatar_text}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.instructorName as TextStyle}>
                  {inst.name}
                  {inst.is_verified ? " ✓" : ""}
                </Text>
                <Text style={s.instructorRole as TextStyle}>{inst.role}</Text>
                <Text style={s.instructorMeta as TextStyle}>
                  {inst.courses_count ?? 0} courses · {inst.students_count?.toLocaleString() ?? 0} students · ⭐ {inst.rating_avg ?? 0}
                </Text>
              </View>
              <View style={{ transform: [{ rotate: "180deg" }] }}>
                <IconArrow size={16} color={colors.g400} />
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </>
  );
}

/* ─── Mobile Course Card ─── */

function MobileCourseCard({
  course,
  progressPct,
  onPress,
}: {
  course: Course;
  progressPct?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.courseCard as ViewStyle} onPress={onPress} activeOpacity={0.7}>
      {/* Thumbnail */}
      <View style={[s.courseThumb, { backgroundColor: course.thumbnail_color }] as ViewStyle[]}>
        <View style={s.coursePlay as ViewStyle}>
          <Text style={{ fontSize: 16 }}>▶</Text>
        </View>
      </View>
      {/* Body */}
      <View style={s.courseBody as ViewStyle}>
        <View style={s.courseMetaRow as ViewStyle}>
          <MBadge
            label={course.level.charAt(0).toUpperCase() + course.level.slice(1)}
            color={LEVEL_COLORS[course.level]}
          />
          <MBadge label={`${course.lessons_count} lessons`} />
          <MBadge label={course.duration_text} />
        </View>
        <Text style={s.courseTitle as TextStyle}>{course.title}</Text>
        <Text style={s.courseDesc as TextStyle} numberOfLines={2}>
          {course.description}
        </Text>
        {/* Footer */}
        <View style={s.courseFooter as ViewStyle}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Avatar name={course.instructor?.name ?? ""} size="sm" />
            <Text style={s.courseInstrName as TextStyle}>{course.instructor?.name}</Text>
          </View>
          <Text
            style={{
              fontFamily: fontFamily.sans.bold,
              fontSize: 14,
              color: course.price === "Free" ? colors.green : colors.black,
            }}
          >
            {course.price}
          </Text>
        </View>
        {/* Progress */}
        {progressPct != null && progressPct > 0 && (
          <>
            <View style={s.progressBar as ViewStyle}>
              <View
                style={[
                  s.progressFill,
                  {
                    width: `${progressPct}%` as any,
                    backgroundColor: progressPct >= 100 ? colors.green : colors.lime,
                  },
                ] as ViewStyle[]}
              />
            </View>
            <Text style={s.progressLabel as TextStyle}>{progressPct}% complete</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

/* ═══════════════════════════════════════════════════
   PATHS TAB
   ═══════════════════════════════════════════════════ */

function PathsTab({
  paths,
  progressMap,
  onCourseClick,
}: {
  paths: LearningPath[];
  progressMap: Map<string, number>;
  onCourseClick: (slug: string) => void;
}) {
  if (!paths.length) {
    return (
      <View style={{ padding: 40, alignItems: "center" }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🛤️</Text>
        <Text style={s.emptyTitle as TextStyle}>No learning paths yet</Text>
      </View>
    );
  }

  return (
    <>
      {paths.map((path) => (
        <View key={path.id} style={{ marginBottom: 32 }}>
          <Text style={s.sectionTitle as TextStyle}>{path.title}</Text>
          <Text style={s.sectionDesc as TextStyle}>{path.description}</Text>

          {/* Timeline */}
          <View style={s.timeline as ViewStyle}>
            {/* Vertical line */}
            <View style={s.timelineLine as ViewStyle} />

            {(path.courses ?? []).map((pc, i) => {
              const course = pc.course;
              if (!course) return null;
              const pct = progressMap.get(course.id) ?? 0;
              const isDone = pct >= 100;
              const prevDone =
                i === 0 ||
                (progressMap.get(path.courses![i - 1]?.course?.id ?? "") ?? 0) >= 100;
              const isCurrent = !isDone && prevDone;
              const isLocked = !isDone && !isCurrent;

              return (
                <View key={pc.course_id} style={s.pathStep as ViewStyle}>
                  {/* Dot */}
                  <View
                    style={[
                      s.pathDot,
                      isDone && s.pathDotDone,
                      isCurrent && s.pathDotCurrent,
                      isLocked && s.pathDotLocked,
                    ] as ViewStyle[]}
                  >
                    <Text
                      style={[
                        s.pathDotText,
                        isDone && { color: colors.lime },
                        isCurrent && { color: colors.black },
                        isLocked && { color: colors.g400 },
                      ] as TextStyle[]}
                    >
                      {isDone ? "✓" : i + 1}
                    </Text>
                  </View>

                  {/* Card */}
                  <TouchableOpacity
                    style={[s.pathCard, isLocked && { opacity: 0.5 }] as ViewStyle[]}
                    onPress={() => !isLocked && onCourseClick(course.slug)}
                    activeOpacity={isLocked ? 1 : 0.7}
                  >
                    <Text style={s.pathCardTitle as TextStyle}>{course.title}</Text>
                    <Text style={s.pathCardDesc as TextStyle}>
                      {course.lessons_count} lessons · {course.duration_text}
                    </Text>
                    {pct > 0 && (
                      <View style={[s.progressBar, { marginTop: 8 }] as ViewStyle[]}>
                        <View
                          style={[
                            s.progressFill,
                            {
                              width: `${pct}%` as any,
                              backgroundColor: isDone ? colors.green : colors.lime,
                            },
                          ] as ViewStyle[]}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </>
  );
}

/* ═══════════════════════════════════════════════════
   CERTIFICATES TAB
   ═══════════════════════════════════════════════════ */

function CertificatesTab({
  certificates,
  userProgress,
  onClaim,
}: {
  certificates: Certificate[];
  userProgress: { course_id: string; progress_pct: number; course?: Course }[];
  onClaim: (courseId: string) => void;
}) {
  const inProgress = userProgress.filter(
    (p) => p.progress_pct > 0 && p.progress_pct < 100,
  );

  if (!certificates.length && !inProgress.length) {
    return (
      <View style={{ padding: 40, alignItems: "center" }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🏆</Text>
        <Text style={s.emptyTitle as TextStyle}>No certificates yet</Text>
        <Text style={s.emptyDesc as TextStyle}>Complete a course to earn your first certificate</Text>
      </View>
    );
  }

  return (
    <>
      {certificates.map((cert) => (
        <View key={cert.id} style={s.certCard as ViewStyle}>
          <View style={s.certAccent as ViewStyle} />
          <View style={{ alignItems: "center", padding: 24 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>🏆</Text>
            <Text style={s.certTitle as TextStyle}>Certificate of Completion</Text>
            <Text style={s.certCourse as TextStyle}>{cert.course?.title}</Text>
            <View style={s.certDashed as ViewStyle}>
              <Text style={s.certDashedText as TextStyle}>
                Completed all course requirements
              </Text>
            </View>
            <View style={s.certMetaRow as ViewStyle}>
              <Text style={s.certMetaText as TextStyle}>
                📅 {new Date(cert.issued_at).toLocaleDateString()}
              </Text>
              <Text style={s.certMetaText as TextStyle}>
                🔑 {cert.certificate_code}
              </Text>
            </View>
          </View>
        </View>
      ))}

      {inProgress.length > 0 && (
        <>
          <Text style={s.sectionTitle as TextStyle}>In Progress</Text>
          {inProgress.map((p) => (
            <View key={p.course_id} style={s.ipCard as ViewStyle}>
              <Text style={s.ipTitle as TextStyle}>{p.course?.title ?? "Course"}</Text>
              <View style={s.progressBar as ViewStyle}>
                <View
                  style={[
                    s.progressFill,
                    {
                      width: `${p.progress_pct}%` as any,
                      backgroundColor: colors.lime,
                    },
                  ] as ViewStyle[]}
                />
              </View>
              <Text style={s.progressLabel as TextStyle}>{p.progress_pct}% complete</Text>
            </View>
          ))}
        </>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════
   COURSE DETAIL DRILL
   ═══════════════════════════════════════════════════ */

function CourseDetailDrill({
  slug,
  onLessonClick,
  onQuizClick,
  onInstructorClick,
}: {
  slug: string;
  onLessonClick: (id: string) => void;
  onQuizClick: (id: string) => void;
  onInstructorClick: (id: string) => void;
}) {
  const { data: course, isLoading } = useCourse(supabase, slug);
  const { data: modules } = useCourseModules(supabase, course?.id ?? null);
  const { data: lessons } = useCourseLessons(supabase, course?.id ?? null);
  const { data: progress } = useUserCourseProgress(supabase, course?.id ?? null);
  const { data: lessonProgress } = useUserLessonProgress(supabase, course?.id ?? null);
  const enrollMutation = useEnrollCourse(supabase);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const completedSet = useMemo(() => {
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
      <>
        <Skeleton width="100%" height={200} radius={14} />
        <Skeleton width="60%" height={24} radius={8} style={{ marginTop: 16 }} />
        <Skeleton width="100%" height={120} radius={14} style={{ marginTop: 12 }} />
      </>
    );
  }

  return (
    <>
      {/* Thumbnail */}
      <View style={[s.drillThumb, { backgroundColor: course.thumbnail_color }] as ViewStyle[]}>
        <View style={s.coursePlay as ViewStyle}>
          <Text style={{ fontSize: 24 }}>▶</Text>
        </View>
      </View>

      {/* Title + meta */}
      <Text style={s.drillTitle as TextStyle}>{course.title}</Text>
      <View style={s.drillMetaRow as ViewStyle}>
        <MBadge
          label={course.level.charAt(0).toUpperCase() + course.level.slice(1)}
          color={LEVEL_COLORS[course.level]}
        />
        <MBadge label={`${course.lessons_count} lessons`} />
        <MBadge label={course.duration_text} />
      </View>

      {/* Instructor */}
      {course.instructor && (
        <TouchableOpacity
          style={s.drillInstructor as ViewStyle}
          onPress={() => onInstructorClick(course.instructor!.id)}
          activeOpacity={0.7}
        >
          <View
            style={[
              s.avatarCircle,
              { backgroundColor: course.instructor.avatar_color, width: 32, height: 32, borderRadius: 16 },
            ] as ViewStyle[]}
          >
            <Text style={[s.avatarText, { fontSize: 12 }] as TextStyle[]}>
              {course.instructor.avatar_text}
            </Text>
          </View>
          <Text style={s.drillInstrName as TextStyle}>{course.instructor.name}</Text>
          <Text style={{ fontSize: 12, color: colors.g400 }}>
            {course.students_count.toLocaleString()} students
          </Text>
        </TouchableOpacity>
      )}

      {/* Enroll / Progress */}
      {!progress ? (
        <TouchableOpacity
          style={s.enrollBtn as ViewStyle}
          onPress={() => enrollMutation.mutate(course.id)}
          activeOpacity={0.7}
          disabled={enrollMutation.isPending}
        >
          <Text style={s.enrollBtnText as TextStyle}>
            {enrollMutation.isPending
              ? "Enrolling..."
              : `Enroll Now${course.price !== "Free" ? ` — ${course.price}` : ""}`}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={{ marginVertical: 12 }}>
          <View style={s.progressBar as ViewStyle}>
            <View
              style={[
                s.progressFill,
                {
                  width: `${progress.progress_pct}%` as any,
                  backgroundColor: progress.progress_pct >= 100 ? colors.green : colors.lime,
                },
              ] as ViewStyle[]}
            />
          </View>
          <Text style={s.progressLabel as TextStyle}>
            {progress.progress_pct}% · {completedSet.size}/{course.lessons_count} lessons
          </Text>
        </View>
      )}

      {/* Description */}
      <Text style={s.drillDesc as TextStyle}>{course.description}</Text>

      {/* Curriculum accordion */}
      <Text style={[s.sectionTitle, { marginTop: 20 }] as TextStyle[]}>Curriculum</Text>
      {(modules ?? []).map((mod, mi) => {
        const modLessons = (lessonsByModule.get(mod.id) ?? []).sort(
          (a, b) => a.sort_order - b.sort_order,
        );
        const isOpen = expandedModule === mod.id;

        return (
          <View key={mod.id} style={s.moduleWrap as ViewStyle}>
            <TouchableOpacity
              style={s.moduleHeader as ViewStyle}
              onPress={() => setExpandedModule(isOpen ? null : mod.id)}
              activeOpacity={0.7}
            >
              <Text style={s.moduleNum as TextStyle}>{String(mi + 1).padStart(2, "0")}</Text>
              <Text style={s.moduleTitle as TextStyle}>{mod.title}</Text>
              <Text style={s.moduleMeta as TextStyle}>{modLessons.length} lessons</Text>
              <Text style={{ fontSize: 12, color: colors.g400 }}>{isOpen ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            {isOpen &&
              modLessons.map((lesson) => {
                const isDone = completedSet.has(lesson.id);
                return (
                  <TouchableOpacity
                    key={lesson.id}
                    style={s.lessonRow as ViewStyle}
                    onPress={() =>
                      progress
                        ? lesson.type === "quiz"
                          ? onQuizClick(lesson.id)
                          : onLessonClick(lesson.id)
                        : undefined
                    }
                    activeOpacity={progress ? 0.7 : 1}
                  >
                    <View
                      style={[
                        s.lessonCheck,
                        isDone && { backgroundColor: colors.green, borderColor: colors.green },
                      ] as ViewStyle[]}
                    >
                      {isDone && <Text style={{ color: colors.white, fontSize: 10 }}>✓</Text>}
                    </View>
                    <Text
                      style={[
                        s.lessonName,
                        !progress && { color: colors.g400 },
                      ] as TextStyle[]}
                      numberOfLines={1}
                    >
                      {lesson.title}
                    </Text>
                    <MBadge label={lesson.type} color={lesson.type === "quiz" ? colors.lime : undefined} />
                    <Text style={s.lessonDur as TextStyle}>{lesson.duration_text}</Text>
                  </TouchableOpacity>
                );
              })}
          </View>
        );
      })}
    </>
  );
}

/* ═══════════════════════════════════════════════════
   LESSON DRILL
   ═══════════════════════════════════════════════════ */

function LessonDrill({
  lessonId,
  courseSlug,
  onLessonClick,
  onQuizClick,
}: {
  lessonId: string;
  courseSlug: string;
  onLessonClick: (id: string) => void;
  onQuizClick: (id: string) => void;
}) {
  const { data: course } = useCourse(supabase, courseSlug);
  const { data: lessons } = useCourseLessons(supabase, course?.id ?? null);
  const { data: lessonProgress } = useUserLessonProgress(supabase, course?.id ?? null);
  const { data: noteData } = useUserNotes(supabase, lessonId);
  const completeMutation = useCompleteLesson(supabase);
  const noteMutation = useSaveNote(supabase);
  const [noteText, setNoteText] = useState("");

  const currentLesson = lessons?.find((l) => l.id === lessonId);
  const completedSet = useMemo(() => {
    const s = new Set<string>();
    for (const lp of lessonProgress ?? []) {
      if (lp.completed) s.add(lp.lesson_id);
    }
    return s;
  }, [lessonProgress]);
  const isCompleted = completedSet.has(lessonId);

  const sorted = useMemo(
    () => [...(lessons ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [lessons],
  );
  const idx = sorted.findIndex((l) => l.id === lessonId);
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;

  if (!currentLesson || !course) {
    return <Skeleton width="100%" height={200} radius={14} />;
  }

  return (
    <>
      {/* Video */}
      <View style={[s.drillThumb, { backgroundColor: course.thumbnail_color, height: 200 }] as ViewStyle[]}>
        <View style={s.coursePlay as ViewStyle}>
          <Text style={{ fontSize: 24 }}>▶</Text>
        </View>
      </View>

      <Text style={s.drillTitle as TextStyle}>{currentLesson.title}</Text>
      <Text style={{ fontSize: 13, color: colors.g400, marginBottom: 16 }}>
        {currentLesson.duration_text} · {currentLesson.type}
      </Text>

      {/* Mark complete */}
      {!isCompleted ? (
        <TouchableOpacity
          style={s.enrollBtn as ViewStyle}
          onPress={() => completeMutation.mutate({ lessonId, courseId: course.id })}
          disabled={completeMutation.isPending}
          activeOpacity={0.7}
        >
          <Text style={s.enrollBtnText as TextStyle}>
            {completeMutation.isPending ? "Saving..." : "✓ Mark Complete"}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={s.completedBadge as ViewStyle}>
          <Text style={s.completedText as TextStyle}>✓ Completed</Text>
        </View>
      )}

      {/* Nav */}
      <View style={s.lessonNav as ViewStyle}>
        {prev ? (
          <TouchableOpacity
            style={s.navBtn as ViewStyle}
            onPress={() => (prev.type === "quiz" ? onQuizClick(prev.id) : onLessonClick(prev.id))}
          >
            <Text style={s.navBtnText as TextStyle}>← Previous</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        {next ? (
          <TouchableOpacity
            style={s.navBtn as ViewStyle}
            onPress={() => (next.type === "quiz" ? onQuizClick(next.id) : onLessonClick(next.id))}
          >
            <Text style={s.navBtnText as TextStyle}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
      </View>

      {/* Notes */}
      <Text style={[s.sectionTitle, { marginTop: 20 }] as TextStyle[]}>My Notes</Text>
      <View style={s.notesArea as ViewStyle}>
        <TextInput
          style={s.notesInput as TextStyle}
          value={noteText}
          onChangeText={setNoteText}
          placeholder="Take notes while watching..."
          placeholderTextColor={colors.g400}
          multiline
          textAlignVertical="top"
        />
        <TouchableOpacity
          style={s.notesSaveBtn as ViewStyle}
          onPress={() => noteMutation.mutate({ lessonId, content: noteText })}
          disabled={noteMutation.isPending}
        >
          <Text style={s.notesSaveBtnText as TextStyle}>
            {noteMutation.isPending ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   QUIZ DRILL
   ═══════════════════════════════════════════════════ */

function QuizDrill({
  lessonId,
  courseSlug,
  onBack,
}: {
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

  function handleSubmit() {
    setSubmitted(true);
  }

  function handleNext() {
    if (currentQ < qs.length - 1) {
      setCurrentQ(currentQ + 1);
      setSubmitted(false);
    } else {
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
    return <Skeleton width="100%" height={300} radius={14} />;
  }

  if (showResult && submitMutation.data) {
    const result = submitMutation.data;
    return (
      <View style={s.quizResult as ViewStyle}>
        <Text style={{ fontSize: 13, color: colors.g400, marginBottom: 8 }}>Quiz Complete</Text>
        <Text
          style={[
            s.quizScore,
            { color: result.passed ? colors.green : colors.red },
          ] as TextStyle[]}
        >
          {result.score}%
        </Text>
        <Text style={s.quizResultMsg as TextStyle}>
          {result.passed
            ? "Congratulations! You passed!"
            : "Not quite. Review the material and try again."}
        </Text>
        <View style={s.quizDots as ViewStyle}>
          {qs.map((_, i) => {
            const correct = (answers[i] ?? -1) === qs[i].correct_index;
            return (
              <View
                key={i}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: correct ? colors.green : colors.red,
                }}
              />
            );
          })}
        </View>
        <TouchableOpacity style={s.enrollBtn as ViewStyle} onPress={onBack}>
          <Text style={s.enrollBtnText as TextStyle}>Return to Course</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Text style={{ fontSize: 13, color: colors.g400, marginBottom: 12 }}>
        Question {currentQ + 1} of {qs.length}
      </Text>

      <View style={s.quizCard as ViewStyle}>
        <Text style={s.quizQuestion as TextStyle}>{question.question}</Text>
        {question.options.map((opt, i) => {
          let bgColor: string = colors.white;
          let borderClr: string = colors.g200;
          if (submitted) {
            if (i === question.correct_index) {
              bgColor = "#dcfce7";
              borderClr = colors.green;
            } else if (i === selectedAnswer) {
              bgColor = "#fee2e2";
              borderClr = colors.red;
            }
          } else if (i === selectedAnswer) {
            bgColor = "rgba(168,255,57,0.1)";
            borderClr = colors.limeDim;
          }

          return (
            <TouchableOpacity
              key={i}
              style={[s.quizOption, { backgroundColor: bgColor, borderColor: borderClr }] as ViewStyle[]}
              onPress={() => selectOption(i)}
              activeOpacity={submitted ? 1 : 0.7}
            >
              <View
                style={[
                  s.quizRadio,
                  submitted && i === question.correct_index && { borderColor: colors.green, backgroundColor: colors.green },
                  submitted && i === selectedAnswer && i !== question.correct_index && { borderColor: colors.red, backgroundColor: colors.red },
                  !submitted && i === selectedAnswer && { borderColor: colors.limeDim },
                ] as ViewStyle[]}
              >
                {!submitted && i === selectedAnswer && (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.lime }} />
                )}
                {submitted && (i === question.correct_index || i === selectedAnswer) && (
                  <Text style={{ color: colors.white, fontSize: 10, fontWeight: "700" }}>
                    {i === question.correct_index ? "✓" : "✗"}
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: 14, flex: 1 }}>{opt}</Text>
            </TouchableOpacity>
          );
        })}

        {submitted && question.explanation && (
          <View style={s.quizExplanation as ViewStyle}>
            <Text style={s.quizExplanationText as TextStyle}>
              <Text style={{ fontFamily: fontFamily.sans.bold }}>Explanation: </Text>
              {question.explanation}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.enrollBtn, { marginTop: 16 }, (!submitted && selectedAnswer === null) && { opacity: 0.5 }] as ViewStyle[]}
          onPress={submitted ? handleNext : handleSubmit}
          disabled={!submitted && selectedAnswer === null}
          activeOpacity={0.7}
        >
          <Text style={s.enrollBtnText as TextStyle}>
            {!submitted
              ? "Submit Answer"
              : currentQ < qs.length - 1
                ? "Next Question →"
                : "Finish Quiz"}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   INSTRUCTOR DRILL
   ═══════════════════════════════════════════════════ */

function InstructorDrill({
  instructorId,
  progressMap,
  onCourseClick,
}: {
  instructorId: string;
  progressMap: Map<string, number>;
  onCourseClick: (slug: string) => void;
}) {
  const { data: instructor, isLoading } = useInstructor(supabase, instructorId);
  const { data: instrCourses } = useInstructorCourses(supabase, instructorId);

  if (isLoading || !instructor) {
    return (
      <>
        <Skeleton width="100%" height={120} radius={14} />
        <Skeleton width="60%" height={24} radius={8} style={{ marginTop: 16 }} />
      </>
    );
  }

  return (
    <>
      {/* Banner */}
      <View style={[s.instrBanner, { backgroundColor: instructor.avatar_color }] as ViewStyle[]} />

      {/* Avatar */}
      <View style={[s.instrAvatar, { backgroundColor: instructor.avatar_color }] as ViewStyle[]}>
        <Text style={s.instrAvatarText as TextStyle}>{instructor.avatar_text}</Text>
      </View>

      {/* Name + handle */}
      <Text style={s.instrName as TextStyle}>
        {instructor.name}
        {instructor.is_verified ? " ✓" : ""}
      </Text>
      <Text style={s.instrHandle as TextStyle}>@{instructor.handle}</Text>

      {/* Bio */}
      {instructor.bio && <Text style={s.instrBio as TextStyle}>{instructor.bio}</Text>}

      {/* Meta */}
      <View style={s.instrMetaRow as ViewStyle}>
        {instructor.location && (
          <Text style={s.instrMetaItem as TextStyle}>📍 {instructor.location}</Text>
        )}
        {instructor.specialization && (
          <Text style={s.instrMetaItem as TextStyle}>🎯 {instructor.specialization}</Text>
        )}
      </View>

      {/* Numbers */}
      <View style={s.instrNumbers as ViewStyle}>
        <View style={s.instrNumItem as ViewStyle}>
          <Text style={s.instrNumVal as TextStyle}>{instructor.students_count?.toLocaleString() ?? 0}</Text>
          <Text style={s.instrNumLabel as TextStyle}>Students</Text>
        </View>
        <View style={s.instrNumItem as ViewStyle}>
          <Text style={s.instrNumVal as TextStyle}>{instructor.courses_count ?? 0}</Text>
          <Text style={s.instrNumLabel as TextStyle}>Courses</Text>
        </View>
        <View style={s.instrNumItem as ViewStyle}>
          <Text style={s.instrNumVal as TextStyle}>{instructor.rating_avg ?? 0}</Text>
          <Text style={s.instrNumLabel as TextStyle}>Rating</Text>
        </View>
        <View style={s.instrNumItem as ViewStyle}>
          <Text style={s.instrNumVal as TextStyle}>{instructor.review_count ?? 0}</Text>
          <Text style={s.instrNumLabel as TextStyle}>Reviews</Text>
        </View>
      </View>

      {/* Courses */}
      {(instrCourses ?? []).length > 0 && (
        <>
          <Text style={s.sectionTitle as TextStyle}>Courses</Text>
          {(instrCourses ?? []).map((c) => (
            <MobileCourseCard
              key={c.id}
              course={c}
              progressPct={progressMap.get(c.id)}
              onPress={() => onCourseClick(c.slug)}
            />
          ))}
        </>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════ */

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.g200,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fontFamily.sans.bold,
    color: colors.black,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.g200,
    backgroundColor: colors.white,
  },
  tabPillActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  tabPillText: {
    fontSize: 13,
    fontFamily: fontFamily.sans.semibold,
    color: colors.g600,
  },
  tabPillTextActive: {
    color: colors.lime,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: radii.md,
    padding: 12,
    alignItems: "center",
  },
  statNum: {
    fontSize: 22,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "800",
    color: colors.black,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: fontFamily.sans.medium,
    color: colors.g400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // Streak
  streakCard: {
    backgroundColor: colors.black,
    borderRadius: radii.lg,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  streakNum: {
    fontSize: 40,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "900",
    color: colors.lime,
  },
  streakLabel: {
    fontSize: 13,
    color: colors.g400,
    marginTop: 2,
  },
  streakDays: {
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
  },
  streakDay: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  streakDayDone: { backgroundColor: colors.lime },
  streakDayToday: {
    backgroundColor: colors.g700,
    borderWidth: 2,
    borderColor: colors.lime,
  },
  streakDayUpcoming: { backgroundColor: colors.g800 },
  streakDayText: {
    fontSize: 10,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "700",
  },

  // Badge
  badge: {
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fontFamily.sans.medium,
    color: colors.g500,
  },

  // Course card
  courseCard: {
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
    backgroundColor: colors.white,
  },
  courseThumb: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  coursePlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  courseBody: { padding: 16 },
  courseMetaRow: { flexDirection: "row", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  courseTitle: {
    fontSize: 16,
    fontFamily: fontFamily.sans.bold,
    color: colors.black,
    marginBottom: 4,
  },
  courseDesc: {
    fontSize: 13,
    color: colors.g500,
    lineHeight: 19,
    marginBottom: 12,
  },
  courseFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.g100,
    paddingTop: 12,
  },
  courseInstrName: {
    fontSize: 13,
    fontFamily: fontFamily.sans.medium,
    color: colors.g600,
  },

  // Progress bar
  progressBar: {
    height: 6,
    backgroundColor: colors.g200,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: fontFamily.mono.regular,
    color: colors.g400,
    marginTop: 4,
  },

  // Section titles
  sectionTitle: {
    fontSize: 16,
    fontFamily: fontFamily.sans.bold,
    color: colors.black,
    marginBottom: 12,
    marginTop: 24,
  },
  sectionDesc: {
    fontSize: 13,
    color: colors.g500,
    lineHeight: 19,
    marginBottom: 16,
  },

  // Instructor row
  instructorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: radii.lg,
    marginBottom: 10,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontFamily: fontFamily.sans.extrabold,
    color: colors.white,
  },
  instructorName: {
    fontSize: 15,
    fontFamily: fontFamily.sans.bold,
    color: colors.black,
  },
  instructorRole: {
    fontSize: 12,
    color: colors.g400,
    marginTop: 1,
  },
  instructorMeta: {
    fontSize: 12,
    color: colors.g500,
    marginTop: 4,
  },

  // Empty state
  emptyTitle: {
    fontSize: 16,
    fontFamily: fontFamily.sans.bold,
    color: colors.g600,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.g400,
    marginTop: 4,
    textAlign: "center",
  },

  // Timeline / paths
  timeline: {
    position: "relative",
    paddingLeft: 36,
  },
  timelineLine: {
    position: "absolute",
    left: 14,
    top: 10,
    bottom: 10,
    width: 2,
    backgroundColor: colors.g200,
  },
  pathStep: {
    position: "relative",
    paddingBottom: 24,
  },
  pathDot: {
    position: "absolute",
    left: -36,
    top: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.g200,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  pathDotDone: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  pathDotCurrent: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  pathDotLocked: {
    backgroundColor: colors.g100,
    borderColor: colors.g300,
  },
  pathDotText: {
    fontSize: 11,
    fontFamily: fontFamily.sans.bold,
  },
  pathCard: {
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: radii.md,
    padding: 14,
    backgroundColor: colors.white,
  },
  pathCardTitle: {
    fontSize: 14,
    fontFamily: fontFamily.sans.semibold,
    color: colors.black,
    marginBottom: 4,
  },
  pathCardDesc: {
    fontSize: 12,
    color: colors.g500,
  },

  // Certificate card
  certCard: {
    borderWidth: 2,
    borderColor: colors.g200,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: colors.white,
  },
  certAccent: {
    height: 6,
    backgroundColor: colors.lime,
  },
  certTitle: {
    fontSize: 18,
    fontFamily: fontFamily.sans.extrabold,
    color: colors.black,
    marginBottom: 4,
  },
  certCourse: {
    fontSize: 14,
    color: colors.g500,
    marginBottom: 16,
  },
  certDashed: {
    borderWidth: 2,
    borderColor: colors.g300,
    borderStyle: "dashed",
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
  },
  certDashedText: {
    fontSize: 12,
    color: colors.g400,
    textAlign: "center",
  },
  certMetaRow: {
    flexDirection: "row",
    gap: 16,
  },
  certMetaText: {
    fontSize: 12,
    color: colors.g400,
  },
  ipCard: {
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 10,
  },
  ipTitle: {
    fontSize: 14,
    fontFamily: fontFamily.sans.semibold,
    color: colors.black,
    marginBottom: 4,
  },

  // Drill views
  drillThumb: {
    height: 180,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  drillTitle: {
    fontSize: 20,
    fontFamily: fontFamily.sans.extrabold,
    color: colors.black,
    marginBottom: 8,
  },
  drillMetaRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  drillInstructor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  drillInstrName: {
    fontSize: 14,
    fontFamily: fontFamily.sans.semibold,
    color: colors.black,
    flex: 1,
  },
  drillDesc: {
    fontSize: 14,
    color: colors.g600,
    lineHeight: 21,
  },
  enrollBtn: {
    backgroundColor: colors.black,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
    marginVertical: 8,
  },
  enrollBtnText: {
    fontSize: 15,
    fontFamily: fontFamily.sans.bold,
    color: colors.lime,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: 8,
  },
  completedText: {
    fontSize: 14,
    fontFamily: fontFamily.sans.semibold,
    color: colors.green,
  },

  // Module/Lesson
  moduleWrap: {
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: radii.md,
    overflow: "hidden",
    marginBottom: 10,
  },
  moduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    backgroundColor: colors.g50,
  },
  moduleNum: {
    fontSize: 11,
    fontFamily: fontFamily.mono.regular,
    color: colors.g400,
    width: 24,
  },
  moduleTitle: {
    fontSize: 14,
    fontFamily: fontFamily.sans.semibold,
    color: colors.black,
    flex: 1,
  },
  moduleMeta: {
    fontSize: 11,
    color: colors.g400,
  },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: colors.g100,
  },
  lessonCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.g300,
    alignItems: "center",
    justifyContent: "center",
  },
  lessonName: {
    fontSize: 13,
    fontFamily: fontFamily.sans.medium,
    color: colors.black,
    flex: 1,
  },
  lessonDur: {
    fontSize: 11,
    fontFamily: fontFamily.mono.regular,
    color: colors.g400,
  },

  // Lesson nav
  lessonNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  navBtn: {
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  navBtnText: {
    fontSize: 13,
    fontFamily: fontFamily.sans.semibold,
    color: colors.g600,
  },

  // Notes
  notesArea: {
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  notesInput: {
    padding: 14,
    minHeight: 100,
    fontSize: 14,
    fontFamily: fontFamily.sans.regular,
    color: colors.black,
  },
  notesSaveBtn: {
    borderTopWidth: 1,
    borderTopColor: colors.g200,
    padding: 12,
    alignItems: "center",
  },
  notesSaveBtnText: {
    fontSize: 13,
    fontFamily: fontFamily.sans.semibold,
    color: colors.black,
  },

  // Quiz
  quizCard: {
    borderWidth: 2,
    borderColor: colors.g200,
    borderRadius: 14,
    padding: 20,
    backgroundColor: colors.white,
  },
  quizQuestion: {
    fontSize: 16,
    fontFamily: fontFamily.sans.semibold,
    color: colors.black,
    lineHeight: 24,
    marginBottom: 16,
  },
  quizOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: radii.md,
    marginBottom: 8,
  },
  quizRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.g300,
    alignItems: "center",
    justifyContent: "center",
  },
  quizExplanation: {
    marginTop: 12,
    padding: 14,
    backgroundColor: colors.g50,
    borderRadius: radii.md,
  },
  quizExplanationText: {
    fontSize: 13,
    color: colors.g600,
    lineHeight: 19,
  },
  quizResult: {
    alignItems: "center",
    padding: 24,
    borderWidth: 2,
    borderColor: colors.g200,
    borderRadius: 14,
  },
  quizScore: {
    fontSize: 56,
    fontFamily: fontFamily.mono.regular,
    fontWeight: "900",
  },
  quizResultMsg: {
    fontSize: 15,
    fontFamily: fontFamily.sans.semibold,
    color: colors.black,
    marginTop: 8,
    textAlign: "center",
  },
  quizDots: {
    flexDirection: "row",
    gap: 6,
    marginTop: 16,
    marginBottom: 20,
  },

  // Instructor profile
  instrBanner: {
    height: 100,
    borderRadius: 14,
    marginBottom: -32,
  },
  instrAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.white,
    alignSelf: "flex-start",
    marginLeft: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  instrAvatarText: {
    fontSize: 24,
    fontFamily: fontFamily.sans.extrabold,
    color: colors.white,
  },
  instrName: {
    fontSize: 22,
    fontFamily: fontFamily.sans.extrabold,
    color: colors.black,
    marginTop: 8,
  },
  instrHandle: {
    fontSize: 14,
    color: colors.g400,
    marginBottom: 8,
  },
  instrBio: {
    fontSize: 14,
    color: colors.g600,
    lineHeight: 21,
    marginBottom: 12,
  },
  instrMetaRow: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  instrMetaItem: {
    fontSize: 13,
    color: colors.g500,
  },
  instrNumbers: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.g200,
    paddingTop: 14,
    marginBottom: 8,
  },
  instrNumItem: {
    flex: 1,
    alignItems: "center",
  },
  instrNumVal: {
    fontSize: 18,
    fontFamily: fontFamily.sans.extrabold,
    color: colors.black,
  },
  instrNumLabel: {
    fontSize: 10,
    color: colors.g400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
