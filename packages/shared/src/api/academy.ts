import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Course,
  CourseLevel,
  CourseModule,
  Lesson,
  QuizQuestion,
  Instructor,
  InstructorReview,
  LearningPath,
  LearningPathCourse,
  UserCourseProgress,
  UserLessonProgress,
  UserQuizAttempt,
  UserNote,
  Certificate,
} from "../types";

/* ─── Read: Courses ─── */

/** Fetch all courses, optionally filtered by level */
export async function getCourses(
  supabase: SupabaseClient,
  level?: CourseLevel,
): Promise<Course[]> {
  let query = supabase
    .from("courses")
    .select("*, instructor:instructors(*)")
    .order("created_at", { ascending: true });

  if (level) {
    query = query.eq("level", level);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Course[];
}

/** Fetch a single course by slug */
export async function getCourse(
  supabase: SupabaseClient,
  slug: string,
): Promise<Course> {
  const { data, error } = await supabase
    .from("courses")
    .select("*, instructor:instructors(*)")
    .eq("slug", slug)
    .single();

  if (error) throw new Error(error.message);
  return data as Course;
}

/** Fetch modules for a course */
export async function getCourseModules(
  supabase: SupabaseClient,
  courseId: string,
): Promise<CourseModule[]> {
  const { data, error } = await supabase
    .from("course_modules")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data as CourseModule[];
}

/** Fetch all lessons for a course, ordered by module then lesson sort order */
export async function getCourseLessons(
  supabase: SupabaseClient,
  courseId: string,
): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data as Lesson[];
}

/** Fetch quiz questions for a lesson */
export async function getQuizQuestions(
  supabase: SupabaseClient,
  lessonId: string,
): Promise<QuizQuestion[]> {
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("lesson_id", lessonId);

  if (error) throw new Error(error.message);
  return data as QuizQuestion[];
}

/* ─── Read: Instructors ─── */

/** Fetch all instructors */
export async function getInstructors(
  supabase: SupabaseClient,
): Promise<Instructor[]> {
  const { data, error } = await supabase
    .from("instructors")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  // Compute stats for each instructor
  const ids = (data as Instructor[]).map((i) => i.id);

  // Courses count + total students
  const { data: courses } = await supabase
    .from("courses")
    .select("instructor_id, students_count")
    .in("instructor_id", ids);

  // Reviews for average rating
  const { data: reviews } = await supabase
    .from("instructor_reviews")
    .select("instructor_id, rating")
    .in("instructor_id", ids);

  const courseMap = new Map<string, { count: number; students: number }>();
  for (const c of courses ?? []) {
    const existing = courseMap.get(c.instructor_id) ?? {
      count: 0,
      students: 0,
    };
    courseMap.set(c.instructor_id, {
      count: existing.count + 1,
      students: existing.students + c.students_count,
    });
  }

  const reviewMap = new Map<string, { total: number; count: number }>();
  for (const r of reviews ?? []) {
    const existing = reviewMap.get(r.instructor_id) ?? {
      total: 0,
      count: 0,
    };
    reviewMap.set(r.instructor_id, {
      total: existing.total + r.rating,
      count: existing.count + 1,
    });
  }

  return (data as Instructor[]).map((i) => {
    const cs = courseMap.get(i.id);
    const rs = reviewMap.get(i.id);
    return {
      ...i,
      courses_count: cs?.count ?? 0,
      students_count: cs?.students ?? 0,
      rating_avg: rs ? Math.round((rs.total / rs.count) * 10) / 10 : 0,
      review_count: rs?.count ?? 0,
    };
  });
}

/** Fetch a single instructor by ID with computed stats */
export async function getInstructor(
  supabase: SupabaseClient,
  instructorId: string,
): Promise<Instructor> {
  const { data, error } = await supabase
    .from("instructors")
    .select("*")
    .eq("id", instructorId)
    .single();

  if (error) throw new Error(error.message);

  // Compute stats
  const { data: courses } = await supabase
    .from("courses")
    .select("students_count")
    .eq("instructor_id", instructorId);

  const { data: reviews } = await supabase
    .from("instructor_reviews")
    .select("rating")
    .eq("instructor_id", instructorId);

  const totalStudents =
    courses?.reduce((s, c) => s + c.students_count, 0) ?? 0;
  const totalRating = reviews?.reduce((s, r) => s + r.rating, 0) ?? 0;
  const reviewCount = reviews?.length ?? 0;

  return {
    ...(data as Instructor),
    courses_count: courses?.length ?? 0,
    students_count: totalStudents,
    rating_avg:
      reviewCount > 0
        ? Math.round((totalRating / reviewCount) * 10) / 10
        : 0,
    review_count: reviewCount,
  };
}

/** Fetch courses by instructor */
export async function getInstructorCourses(
  supabase: SupabaseClient,
  instructorId: string,
): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*, instructor:instructors(*)")
    .eq("instructor_id", instructorId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data as Course[];
}

/** Fetch reviews for an instructor */
export async function getInstructorReviews(
  supabase: SupabaseClient,
  instructorId: string,
): Promise<InstructorReview[]> {
  const { data, error } = await supabase
    .from("instructor_reviews")
    .select("*, user:profiles(display_name, username, avatar_url)")
    .eq("instructor_id", instructorId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as InstructorReview[];
}

/* ─── Read: Learning Paths ─── */

/** Fetch all learning paths with their courses */
export async function getLearningPaths(
  supabase: SupabaseClient,
): Promise<LearningPath[]> {
  const { data: paths, error: pathError } = await supabase
    .from("learning_paths")
    .select("*");

  if (pathError) throw new Error(pathError.message);

  const { data: pathCourses, error: pcError } = await supabase
    .from("learning_path_courses")
    .select("*, course:courses(*, instructor:instructors(*))")
    .order("sort_order", { ascending: true });

  if (pcError) throw new Error(pcError.message);

  return (paths as LearningPath[]).map((p) => ({
    ...p,
    courses: (pathCourses as LearningPathCourse[]).filter(
      (pc) => pc.path_id === p.id,
    ),
  }));
}

/* ─── Read: User Progress ─── */

/** Fetch all enrolled courses for current user */
export async function getUserAllProgress(
  supabase: SupabaseClient,
): Promise<UserCourseProgress[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_course_progress")
    .select("*, course:courses(*, instructor:instructors(*))")
    .eq("user_id", user.id)
    .order("enrolled_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as UserCourseProgress[];
}

/** Fetch progress for a single course */
export async function getUserCourseProgress(
  supabase: SupabaseClient,
  courseId: string,
): Promise<UserCourseProgress | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_course_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as UserCourseProgress | null;
}

/** Fetch lesson completions for a course */
export async function getUserLessonProgress(
  supabase: SupabaseClient,
  courseId: string,
): Promise<UserLessonProgress[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Get all lesson IDs for this course
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId);

  if (!lessons?.length) return [];
  const lessonIds = lessons.map((l) => l.id);

  const { data, error } = await supabase
    .from("user_lesson_progress")
    .select("*")
    .eq("user_id", user.id)
    .in("lesson_id", lessonIds);

  if (error) throw new Error(error.message);
  return data as UserLessonProgress[];
}

/** Fetch user certificates */
export async function getUserCertificates(
  supabase: SupabaseClient,
): Promise<Certificate[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("certificates")
    .select("*, course:courses(*, instructor:instructors(*))")
    .eq("user_id", user.id)
    .order("issued_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Certificate[];
}

/** Fetch user notes for a lesson */
export async function getUserNotes(
  supabase: SupabaseClient,
  lessonId: string,
): Promise<UserNote | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_notes")
    .select("*")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as UserNote | null;
}

/** Fetch quiz attempts for a lesson */
export async function getUserQuizAttempts(
  supabase: SupabaseClient,
  lessonId: string,
): Promise<UserQuizAttempt[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_quiz_attempts")
    .select("*")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .order("attempted_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as UserQuizAttempt[];
}

/* ─── Write: Actions ─── */

/** Enroll current user in a course */
export async function enrollInCourse(
  supabase: SupabaseClient,
  courseId: string,
): Promise<UserCourseProgress> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("user_course_progress")
    .insert({ user_id: user.id, course_id: courseId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as UserCourseProgress;
}

/** Mark a lesson as complete and recalculate course progress */
export async function completeLesson(
  supabase: SupabaseClient,
  lessonId: string,
  courseId: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Upsert lesson progress
  const { error: lpError } = await supabase
    .from("user_lesson_progress")
    .upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" },
    );

  if (lpError) throw new Error(lpError.message);

  // Recalculate course progress
  const { data: allLessons } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId);

  const totalLessons = allLessons?.length ?? 0;
  if (totalLessons === 0) return;

  const lessonIds = allLessons!.map((l) => l.id);
  const { data: completed } = await supabase
    .from("user_lesson_progress")
    .select("lesson_id")
    .eq("user_id", user.id)
    .eq("completed", true)
    .in("lesson_id", lessonIds);

  const completedCount = completed?.length ?? 0;
  const progressPct = Math.round((completedCount / totalLessons) * 100);
  const isComplete = progressPct >= 100;

  const { error: ucpError } = await supabase
    .from("user_course_progress")
    .update({
      progress_pct: Math.min(progressPct, 100),
      current_lesson_id: lessonId,
      ...(isComplete ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq("user_id", user.id)
    .eq("course_id", courseId);

  if (ucpError) throw new Error(ucpError.message);
}

/** Submit quiz answers, calculate score, return attempt */
export async function submitQuiz(
  supabase: SupabaseClient,
  lessonId: string,
  answers: number[],
): Promise<UserQuizAttempt> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch correct answers
  const { data: questions, error: qError } = await supabase
    .from("quiz_questions")
    .select("correct_index")
    .eq("lesson_id", lessonId);

  if (qError) throw new Error(qError.message);
  if (!questions?.length) throw new Error("No questions found");

  // Score: percentage of correct answers
  let correct = 0;
  for (let i = 0; i < questions.length; i++) {
    if (answers[i] === questions[i].correct_index) correct++;
  }
  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= 70;

  const { data, error } = await supabase
    .from("user_quiz_attempts")
    .insert({
      user_id: user.id,
      lesson_id: lessonId,
      score,
      passed,
      answers,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as UserQuizAttempt;
}

/** Save or update a note for a lesson */
export async function saveNote(
  supabase: SupabaseClient,
  lessonId: string,
  content: string,
): Promise<UserNote> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("user_notes")
    .upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        content,
      },
      { onConflict: "user_id,lesson_id" },
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as UserNote;
}

/** Issue a certificate for a completed course */
export async function issueCertificate(
  supabase: SupabaseClient,
  courseId: string,
): Promise<Certificate> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Generate unique certificate code
  const code = `PROP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const { data, error } = await supabase
    .from("certificates")
    .insert({
      user_id: user.id,
      course_id: courseId,
      certificate_code: code,
    })
    .select("*, course:courses(*, instructor:instructors(*))")
    .single();

  if (error) throw new Error(error.message);
  return data as Certificate;
}
