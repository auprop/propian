import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminStats, PostReport, ModAction, AutoModRule, ComparisonFeature, AlgorithmConfig, AdminPodcast, AdminCourseDetail, AdminCourseStudent, BunnyLibraryVideo, AdminCourseAnalytics, AdminAcademyOverviewStats } from "../types/admin";
import type { Course, CourseModule, Lesson } from "../types/academy";

// ─── Dashboard Stats ───

export async function getAdminStats(supabase: SupabaseClient): Promise<AdminStats> {
  const [users, posts, firms, reviews, reports, banned, shadowbanned] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("firms").select("id", { count: "exact", head: true }),
    supabase.from("firm_reviews").select("id", { count: "exact", head: true }),
    supabase.from("post_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).not("banned_at", "is", null),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("shadowbanned", true),
  ]);

  return {
    totalUsers: users.count ?? 0,
    activeUsers7d: 0, // Would need a date filter on last login
    totalPosts: posts.count ?? 0,
    totalFirms: firms.count ?? 0,
    totalReviews: reviews.count ?? 0,
    pendingReports: reports.count ?? 0,
    bannedUsers: banned.count ?? 0,
    shadowbannedUsers: shadowbanned.count ?? 0,
  };
}

// ─── User Management ───

export async function adminSearchUsers(supabase: SupabaseClient, query: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data;
}

export async function adminGetUsers(supabase: SupabaseClient, limit = 50) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function adminBanUser(supabase: SupabaseClient, userId: string, reason: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ banned_at: new Date().toISOString(), ban_reason: reason })
    .eq("id", userId);

  if (error) throw error;

  // Log mod action
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("mod_actions").insert({
      admin_id: user.id,
      action: "ban",
      target_type: "user",
      target_id: userId,
      reason,
    });
  }
}

export async function adminUnbanUser(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ banned_at: null, ban_reason: null })
    .eq("id", userId);

  if (error) throw error;

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("mod_actions").insert({
      admin_id: user.id,
      action: "unban",
      target_type: "user",
      target_id: userId,
    });
  }
}

export async function adminShadowbanUser(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ shadowbanned: true })
    .eq("id", userId);

  if (error) throw error;

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("mod_actions").insert({
      admin_id: user.id,
      action: "shadowban",
      target_type: "user",
      target_id: userId,
    });
  }
}

export async function adminSetVerified(supabase: SupabaseClient, userId: string, verified: boolean) {
  const { error } = await supabase
    .from("profiles")
    .update({ is_verified: verified })
    .eq("id", userId);

  if (error) throw error;

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("mod_actions").insert({
      admin_id: user.id,
      action: verified ? "verify" : "unverify",
      target_type: "user",
      target_id: userId,
    });
  }
}

export async function adminUnshadowbanUser(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ shadowbanned: false })
    .eq("id", userId);

  if (error) throw error;

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("mod_actions").insert({
      admin_id: user.id,
      action: "unshadowban",
      target_type: "user",
      target_id: userId,
    });
  }
}

export async function adminSetAdmin(supabase: SupabaseClient, userId: string, isAdmin: boolean) {
  const { error } = await supabase
    .from("profiles")
    .update({ is_admin: isAdmin })
    .eq("id", userId);

  if (error) throw error;

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("mod_actions").insert({
      admin_id: user.id,
      action: isAdmin ? "grant_admin" : "revoke_admin",
      target_type: "user",
      target_id: userId,
    });
  }
}

export async function adminDeleteUser(supabase: SupabaseClient, userId: string, reason?: string) {
  // Delete profile (cascades to posts, comments, etc. via FK constraints)
  const { error } = await supabase.from("profiles").delete().eq("id", userId);
  if (error) throw error;

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("mod_actions").insert({
      admin_id: user.id,
      action: "delete_user",
      target_type: "user",
      target_id: userId,
      reason,
    });
  }
}

export async function adminGetUserDetail(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

// ─── Firms ───

export async function adminGetFirms(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("firms")
    .select("*")
    .order("rating_avg", { ascending: false });

  if (error) throw error;
  return data;
}

export async function adminUpdateFirm(supabase: SupabaseClient, firmId: string, updates: Record<string, unknown>) {
  const { error } = await supabase
    .from("firms")
    .update(updates)
    .eq("id", firmId);

  if (error) throw error;
}

// ─── Reports & Moderation ───

export async function adminGetReports(supabase: SupabaseClient, status = "pending") {
  const { data, error } = await supabase
    .from("post_reports")
    .select(`
      *,
      post:posts(id, content, user_id, profiles:profiles!posts_user_id_fkey(username, display_name)),
      comment:comments(id, content, user_id, profiles:profiles!comments_user_id_fkey(username, display_name)),
      reporter:profiles!post_reports_reporter_id_fkey(username, display_name)
    `)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data as PostReport[];
}

export async function adminResolveReport(supabase: SupabaseClient, reportId: string, action: "resolved" | "dismissed") {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("post_reports")
    .update({ status: action, resolved_by: user.id, resolved_at: new Date().toISOString() })
    .eq("id", reportId);

  if (error) throw error;

  await supabase.from("mod_actions").insert({
    admin_id: user.id,
    action: action === "resolved" ? "resolve_report" : "dismiss_report",
    target_type: "report",
    target_id: reportId,
  });
}

export async function adminDeletePost(supabase: SupabaseClient, postId: string, reason?: string) {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("mod_actions").insert({
      admin_id: user.id,
      action: "delete_post",
      target_type: "post",
      target_id: postId,
      reason,
    });
  }
}

export async function adminDeleteComment(supabase: SupabaseClient, commentId: string, reason?: string) {
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) throw error;

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("mod_actions").insert({
      admin_id: user.id,
      action: "delete_comment",
      target_type: "comment",
      target_id: commentId,
      reason,
    });
  }
}

// ─── Auto-Mod Rules ───

export async function adminGetModRules(supabase: SupabaseClient): Promise<AutoModRule[]> {
  const { data, error } = await supabase
    .from("auto_mod_rules")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as AutoModRule[];
}

export async function adminToggleModRule(supabase: SupabaseClient, ruleId: string, active: boolean) {
  const { error } = await supabase
    .from("auto_mod_rules")
    .update({ is_active: active })
    .eq("id", ruleId);

  if (error) throw error;
}

// ─── Comparison Features ───

export async function adminGetComparisonFeatures(supabase: SupabaseClient): Promise<ComparisonFeature[]> {
  const { data, error } = await supabase
    .from("comparison_features")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data as ComparisonFeature[];
}

export async function adminToggleComparisonFeature(supabase: SupabaseClient, featureId: string, active: boolean) {
  const { error } = await supabase
    .from("comparison_features")
    .update({ is_active: active })
    .eq("id", featureId);

  if (error) throw error;
}

// ─── Algorithm Config ───

export async function adminGetAlgoConfig(supabase: SupabaseClient): Promise<AlgorithmConfig[]> {
  const { data, error } = await supabase
    .from("algorithm_config")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data as AlgorithmConfig[];
}

export async function adminUpdateAlgoConfig(supabase: SupabaseClient, configId: string, updates: Partial<AlgorithmConfig>) {
  const { error } = await supabase
    .from("algorithm_config")
    .update(updates)
    .eq("id", configId);

  if (error) throw error;
}

// ─── Academy (admin) ───

export async function adminGetCourses(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("courses")
    .select("*, instructors(name, handle, avatar_text, avatar_color)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function adminGetCourseDetail(supabase: SupabaseClient, courseId: string): Promise<AdminCourseDetail> {
  // Fetch course with instructor
  const { data: course, error: courseErr } = await supabase
    .from("courses")
    .select("*, instructors(*)")
    .eq("id", courseId)
    .single();

  if (courseErr) throw courseErr;

  // Fetch modules with their lessons
  const { data: modules, error: modErr } = await supabase
    .from("course_modules")
    .select("*, lessons(*)")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  if (modErr) throw modErr;

  // Sort lessons within each module
  const sortedModules = (modules ?? []).map((m: CourseModule & { lessons: Lesson[] }) => ({
    ...m,
    lessons: (m.lessons ?? []).sort((a: Lesson, b: Lesson) => a.sort_order - b.sort_order),
  }));

  return {
    ...course,
    modules: sortedModules,
    instructor: course.instructors,
  } as AdminCourseDetail;
}

export async function adminCreateCourse(
  supabase: SupabaseClient,
  data: {
    title: string;
    slug: string;
    description: string;
    level: string;
    duration_text: string;
    price: string;
    price_type?: string;
    price_cents?: number;
    thumbnail_color: string;
    instructor_id: string;
    status?: string;
    category?: string;
    tags?: string[];
    certificate_enabled?: boolean;
  }
): Promise<Course> {
  const { data: course, error } = await supabase
    .from("courses")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return course as Course;
}

export async function adminUpdateCourse(
  supabase: SupabaseClient,
  courseId: string,
  updates: Partial<Omit<Course, "id" | "created_at">>
) {
  const { error } = await supabase
    .from("courses")
    .update(updates)
    .eq("id", courseId);

  if (error) throw error;
}

export async function adminDeleteCourse(supabase: SupabaseClient, courseId: string) {
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) throw error;
}

// ─── Modules ───

export async function adminCreateModule(
  supabase: SupabaseClient,
  courseId: string,
  title: string,
  sortOrder: number
): Promise<CourseModule> {
  const { data, error } = await supabase
    .from("course_modules")
    .insert({ course_id: courseId, title, sort_order: sortOrder })
    .select()
    .single();

  if (error) throw error;
  return data as CourseModule;
}

export async function adminUpdateModule(
  supabase: SupabaseClient,
  moduleId: string,
  updates: Partial<Omit<CourseModule, "id" | "course_id">>
) {
  const { error } = await supabase
    .from("course_modules")
    .update(updates)
    .eq("id", moduleId);

  if (error) throw error;
}

export async function adminDeleteModule(supabase: SupabaseClient, moduleId: string) {
  const { error } = await supabase.from("course_modules").delete().eq("id", moduleId);
  if (error) throw error;
}

export async function adminReorderModules(
  supabase: SupabaseClient,
  modules: { id: string; sort_order: number }[]
) {
  // Update each module's sort_order in sequence
  for (const mod of modules) {
    const { error } = await supabase
      .from("course_modules")
      .update({ sort_order: mod.sort_order })
      .eq("id", mod.id);
    if (error) throw error;
  }
}

// ─── Lessons ───

export async function adminCreateLesson(
  supabase: SupabaseClient,
  data: {
    module_id: string;
    course_id: string;
    title: string;
    type: string;
    duration_text: string;
    sort_order: number;
    video_url?: string;
    content?: string;
    bunny_video_id?: string;
  }
): Promise<Lesson> {
  const { data: lesson, error } = await supabase
    .from("lessons")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return lesson as Lesson;
}

export async function adminUpdateLesson(
  supabase: SupabaseClient,
  lessonId: string,
  updates: Partial<Omit<Lesson, "id" | "course_id">>
) {
  const { error } = await supabase
    .from("lessons")
    .update(updates)
    .eq("id", lessonId);

  if (error) throw error;
}

export async function adminDeleteLesson(supabase: SupabaseClient, lessonId: string, courseId?: string) {
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) throw error;
}

export async function adminReorderLessons(
  supabase: SupabaseClient,
  lessons: { id: string; sort_order: number }[]
) {
  for (const les of lessons) {
    const { error } = await supabase
      .from("lessons")
      .update({ sort_order: les.sort_order })
      .eq("id", les.id);
    if (error) throw error;
  }
}

// ─── Quiz Questions ───

export async function adminGetQuizQuestions(supabase: SupabaseClient, lessonId: string) {
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("id", { ascending: true });

  if (error) throw error;
  return data;
}

export async function adminUpsertQuizQuestion(
  supabase: SupabaseClient,
  data: {
    id?: string;
    lesson_id: string;
    question: string;
    options: string[];
    correct_index: number;
    explanation?: string;
  }
) {
  if (data.id) {
    const { error } = await supabase
      .from("quiz_questions")
      .update({
        question: data.question,
        options: data.options,
        correct_index: data.correct_index,
        explanation: data.explanation,
      })
      .eq("id", data.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("quiz_questions")
      .insert({
        lesson_id: data.lesson_id,
        question: data.question,
        options: data.options,
        correct_index: data.correct_index,
        explanation: data.explanation,
      });
    if (error) throw error;
  }
}

export async function adminDeleteQuizQuestion(supabase: SupabaseClient, questionId: string) {
  const { error } = await supabase.from("quiz_questions").delete().eq("id", questionId);
  if (error) throw error;
}

// ─── Thumbnail Library ───

export async function adminGetThumbnailLibrary(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("courses")
    .select("thumbnail_url")
    .not("thumbnail_url", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return [...new Set(data.map(d => d.thumbnail_url).filter(Boolean))] as string[];
}

// ─── Video Library (Bunny.net) ───

export async function adminGetVideoLibrary(): Promise<BunnyLibraryVideo[]> {
  const res = await fetch("/api/bunny/library");
  if (!res.ok) throw new Error("Failed to fetch video library");
  const data = await res.json();
  return data.videos;
}

// ─── Instructors ───

export async function adminGetInstructors(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("instructors")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function adminCreateInstructor(
  supabase: SupabaseClient,
  instructor: { name: string; handle: string; avatar_text: string; avatar_color: string; role: string; bio?: string; specialization?: string }
) {
  const { data, error } = await supabase
    .from("instructors")
    .insert(instructor)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function adminUpdateInstructor(
  supabase: SupabaseClient,
  instructorId: string,
  updates: Record<string, unknown>
) {
  const { error } = await supabase
    .from("instructors")
    .update(updates)
    .eq("id", instructorId);

  if (error) throw error;
}

// ─── Podcasts ───

export async function adminGetPodcasts(supabase: SupabaseClient): Promise<AdminPodcast[]> {
  const { data, error } = await supabase
    .from("podcasts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as AdminPodcast[];
}

export async function adminCreatePodcast(
  supabase: SupabaseClient,
  data: {
    title: string;
    guest?: string;
    duration: string;
    publish_date?: string;
    status?: string;
    audio_url?: string;
    description?: string;
  }
): Promise<AdminPodcast> {
  const { data: podcast, error } = await supabase
    .from("podcasts")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return podcast as AdminPodcast;
}

export async function adminUpdatePodcast(
  supabase: SupabaseClient,
  podcastId: string,
  updates: Partial<Omit<AdminPodcast, "id" | "created_at">>
) {
  const { error } = await supabase
    .from("podcasts")
    .update(updates)
    .eq("id", podcastId);

  if (error) throw error;
}

export async function adminDeletePodcast(supabase: SupabaseClient, podcastId: string) {
  const { error } = await supabase.from("podcasts").delete().eq("id", podcastId);
  if (error) throw error;
}

// ─── Course Students (admin read-only) ───

export async function adminGetCourseStudents(
  supabase: SupabaseClient,
  courseId: string,
  limit = 50
): Promise<AdminCourseStudent[]> {
  const { data, error } = await supabase
    .from("user_course_progress")
    .select("*, user:profiles!user_course_progress_user_id_fkey(display_name, username, avatar_url)")
    .eq("course_id", courseId)
    .order("enrolled_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as AdminCourseStudent[];
}

// ─── Course Analytics ───

export async function adminGetCourseAnalytics(
  supabase: SupabaseClient,
  courseId: string
): Promise<AdminCourseAnalytics> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Phase 1: 4 parallel queries
  const [enrolledRes, recentRes, certsRes, lessonsRes] = await Promise.all([
    // All enrolled students (need rows to count completed_at)
    supabase
      .from("user_course_progress")
      .select("completed_at")
      .eq("course_id", courseId),
    // Recently enrolled (last 7 days) — proxy for "active learners"
    supabase
      .from("user_course_progress")
      .select("user_id", { count: "exact", head: true })
      .eq("course_id", courseId)
      .gte("enrolled_at", sevenDaysAgo),
    // Certificates issued
    supabase
      .from("certificates")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId),
    // Lessons for this course (for drop-off titles + IDs)
    supabase
      .from("lessons")
      .select("id, title, sort_order")
      .eq("course_id", courseId)
      .order("sort_order", { ascending: true }),
  ]);

  if (enrolledRes.error) throw enrolledRes.error;
  if (lessonsRes.error) throw lessonsRes.error;

  const enrolledRows = enrolledRes.data ?? [];
  const enrolledCount = enrolledRows.length;
  const completedCount = enrolledRows.filter(r => r.completed_at !== null).length;
  const completionRate = enrolledCount > 0
    ? Math.round((completedCount / enrolledCount) * 100)
    : 0;
  const activeLearners = recentRes.count ?? 0;
  const enrolledThisWeek = recentRes.count ?? 0;
  const certificatesIssued = certsRes.count ?? 0;

  const lessons = lessonsRes.data ?? [];
  const lessonIds = lessons.map(l => l.id);

  // Phase 2: Per-lesson completion data
  let lessonDropOff: AdminCourseAnalytics["lessonDropOff"] = [];

  if (lessonIds.length > 0 && enrolledCount > 0) {
    const { data: ulpData, error: ulpErr } = await supabase
      .from("user_lesson_progress")
      .select("lesson_id")
      .in("lesson_id", lessonIds)
      .eq("completed", true);

    if (ulpErr) throw ulpErr;

    const completionMap = new Map<string, number>();
    for (const row of ulpData ?? []) {
      completionMap.set(row.lesson_id, (completionMap.get(row.lesson_id) ?? 0) + 1);
    }

    lessonDropOff = lessons.map(les => {
      const count = completionMap.get(les.id) ?? 0;
      return {
        lessonId: les.id,
        lessonTitle: les.title,
        completedCount: count,
        completionPct: Math.round((count / enrolledCount) * 100),
      };
    });
  } else {
    lessonDropOff = lessons.map(les => ({
      lessonId: les.id,
      lessonTitle: les.title,
      completedCount: 0,
      completionPct: 0,
    }));
  }

  return { enrolledCount, activeLearners, certificatesIssued, completionRate, enrolledThisWeek, lessonDropOff };
}

export async function adminGetAcademyOverviewStats(
  supabase: SupabaseClient
): Promise<AdminAcademyOverviewStats> {
  const [enrolledRes, certsRes, lessonsRes] = await Promise.all([
    supabase.from("user_course_progress").select("user_id, completed_at, course_id"),
    supabase.from("certificates").select("id", { count: "exact", head: true }),
    supabase.from("lessons").select("course_id"),
  ]);

  if (enrolledRes.error) throw enrolledRes.error;

  const rows = enrolledRes.data ?? [];
  const totalEnrollments = rows.length;
  const completedCount = rows.filter(r => r.completed_at !== null).length;
  const overallCompletionRate = totalEnrollments > 0
    ? Math.round((completedCount / totalEnrollments) * 100)
    : 0;

  // Unique students (distinct user_ids)
  const uniqueUserIds = new Set(rows.map(r => r.user_id));
  const uniqueStudents = uniqueUserIds.size;

  // Per-course enrollment counts
  const enrollmentByCourse: Record<string, number> = {};
  for (const row of rows) {
    enrollmentByCourse[row.course_id] = (enrollmentByCourse[row.course_id] ?? 0) + 1;
  }

  // Per-course lesson counts
  const lessonsByCourse: Record<string, number> = {};
  for (const row of lessonsRes.data ?? []) {
    lessonsByCourse[row.course_id] = (lessonsByCourse[row.course_id] ?? 0) + 1;
  }

  return {
    uniqueStudents,
    totalEnrollments,
    overallCompletionRate,
    totalCertificates: certsRes.count ?? 0,
    enrollmentByCourse,
    lessonsByCourse,
  };
}

// ─── Mod Actions Log ───

export async function adminGetModActions(supabase: SupabaseClient, limit = 50): Promise<ModAction[]> {
  const { data, error } = await supabase
    .from("mod_actions")
    .select("*, admin:profiles!mod_actions_admin_id_fkey(username, display_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as ModAction[];
}

// ─── App Settings ───

export interface ProSubscriptionConfig {
  product_id: string | null;
  price_id: string | null;
  amount_cents: number;
  interval: string;
}

/** Read a single app setting by key */
export async function getAppSetting<T = unknown>(
  supabase: SupabaseClient,
  key: string,
): Promise<T | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) throw error;
  return (data?.value as T) ?? null;
}

/** Read the Pro subscription Stripe config */
export async function getProSubscriptionConfig(
  supabase: SupabaseClient,
): Promise<ProSubscriptionConfig> {
  const config = await getAppSetting<ProSubscriptionConfig>(supabase, "stripe_pro");
  return config ?? { product_id: null, price_id: null, amount_cents: 0, interval: "month" };
}
