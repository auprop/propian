import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAdminStats,
  adminGetUsers,
  adminSearchUsers,
  adminBanUser,
  adminUnbanUser,
  adminShadowbanUser,
  adminSetVerified,
  adminGetFirms,
  adminUpdateFirm,
  adminGetReports,
  adminResolveReport,
  adminDeletePost,
  adminDeleteComment,
  adminGetModRules,
  adminToggleModRule,
  adminGetComparisonFeatures,
  adminToggleComparisonFeature,
  adminGetAlgoConfig,
  adminUpdateAlgoConfig,
  adminGetCourses,
  adminGetCourseDetail,
  adminCreateCourse,
  adminUpdateCourse,
  adminDeleteCourse,
  adminCreateModule,
  adminUpdateModule,
  adminDeleteModule,
  adminCreateLesson,
  adminUpdateLesson,
  adminDeleteLesson,
  adminGetQuizQuestions,
  adminUpsertQuizQuestion,
  adminDeleteQuizQuestion,
  adminGetThumbnailLibrary,
  adminGetVideoLibrary,
  adminGetInstructors,
  adminCreateInstructor,
  adminUpdateInstructor,
  adminGetPodcasts,
  adminCreatePodcast,
  adminUpdatePodcast,
  adminDeletePodcast,
  adminGetCourseStudents,
  adminGetCourseAnalytics,
  adminGetAcademyOverviewStats,
  adminGetModActions,
  adminUnshadowbanUser,
  adminSetAdmin,
  adminDeleteUser,
  adminGetUserDetail,
  getProSubscriptionConfig,
} from "../api/admin";
import type { Course, CourseModule, Lesson } from "../types/academy";
import type { AdminPodcast } from "../types/admin";

export function useAdminStats(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => getAdminStats(supabase),
    staleTime: 30_000,
  });
}

export function useAdminUsers(supabase: SupabaseClient, search?: string) {
  return useQuery({
    queryKey: ["admin", "users", search],
    queryFn: () => (search ? adminSearchUsers(supabase, search) : adminGetUsers(supabase)),
    staleTime: 10_000,
  });
}

export function useAdminBanUser(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminBanUser(supabase, userId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useAdminUnbanUser(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminUnbanUser(supabase, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useAdminShadowbanUser(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminShadowbanUser(supabase, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useAdminSetVerified(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, verified }: { userId: string; verified: boolean }) =>
      adminSetVerified(supabase, userId, verified),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useAdminUnshadowbanUser(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminUnshadowbanUser(supabase, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useAdminSetAdmin(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) =>
      adminSetAdmin(supabase, userId, isAdmin),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useAdminDeleteUser(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      adminDeleteUser(supabase, userId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useAdminUserDetail(supabase: SupabaseClient, userId: string | null) {
  return useQuery({
    queryKey: ["admin", "userDetail", userId],
    queryFn: () => adminGetUserDetail(supabase, userId!),
    enabled: !!userId,
  });
}

export function useAdminFirms(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["admin", "firms"],
    queryFn: () => adminGetFirms(supabase),
  });
}

export function useAdminUpdateFirm(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ firmId, updates }: { firmId: string; updates: Record<string, unknown> }) =>
      adminUpdateFirm(supabase, firmId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "firms"] });
    },
  });
}

export function useAdminReports(supabase: SupabaseClient, status = "pending") {
  return useQuery({
    queryKey: ["admin", "reports", status],
    queryFn: () => adminGetReports(supabase, status),
  });
}

export function useAdminResolveReport(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, action }: { reportId: string; action: "resolved" | "dismissed" }) =>
      adminResolveReport(supabase, reportId, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useAdminDeletePost(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, reason }: { postId: string; reason?: string }) =>
      adminDeletePost(supabase, postId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useAdminDeleteComment(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, reason }: { commentId: string; reason?: string }) =>
      adminDeleteComment(supabase, commentId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
  });
}

export function useAdminModRules(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["admin", "modRules"],
    queryFn: () => adminGetModRules(supabase),
  });
}

export function useAdminToggleModRule(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleId, active }: { ruleId: string; active: boolean }) =>
      adminToggleModRule(supabase, ruleId, active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "modRules"] });
    },
  });
}

export function useAdminComparisonFeatures(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["admin", "comparisonFeatures"],
    queryFn: () => adminGetComparisonFeatures(supabase),
  });
}

export function useAdminToggleComparisonFeature(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ featureId, active }: { featureId: string; active: boolean }) =>
      adminToggleComparisonFeature(supabase, featureId, active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "comparisonFeatures"] });
    },
  });
}

export function useAdminAlgoConfig(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["admin", "algoConfig"],
    queryFn: () => adminGetAlgoConfig(supabase),
  });
}

export function useAdminUpdateAlgoConfig(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ configId, updates }: { configId: string; updates: Record<string, unknown> }) =>
      adminUpdateAlgoConfig(supabase, configId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "algoConfig"] });
    },
  });
}

export function useAdminCourses(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["admin", "courses"],
    queryFn: () => adminGetCourses(supabase),
  });
}

export function useAdminCourseDetail(supabase: SupabaseClient, courseId: string | null) {
  return useQuery({
    queryKey: ["admin", "courseDetail", courseId],
    queryFn: () => adminGetCourseDetail(supabase, courseId!),
    enabled: !!courseId,
  });
}

export function useAdminCreateCourse(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string; slug: string; description: string; level: string;
      duration_text: string; price: string; thumbnail_color: string;
      instructor_id: string; status?: string; category?: string;
      tags?: string[]; certificate_enabled?: boolean;
    }) => adminCreateCourse(supabase, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "courses"] });
    },
  });
}

export function useAdminUpdateCourse(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, updates }: { courseId: string; updates: Partial<Omit<Course, "id" | "created_at">> }) =>
      adminUpdateCourse(supabase, courseId, updates),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "courses"] });
      qc.invalidateQueries({ queryKey: ["admin", "courseDetail", variables.courseId] });
    },
  });
}

export function useAdminDeleteCourse(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => adminDeleteCourse(supabase, courseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "courses"] });
    },
  });
}

// ─── Modules ───

export function useAdminCreateModule(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, title, sortOrder }: { courseId: string; title: string; sortOrder: number }) =>
      adminCreateModule(supabase, courseId, title, sortOrder),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "courseDetail", variables.courseId] });
    },
  });
}

export function useAdminUpdateModule(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, updates, courseId }: { moduleId: string; updates: Partial<Omit<CourseModule, "id" | "course_id">>; courseId: string }) =>
      adminUpdateModule(supabase, moduleId, updates),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "courseDetail", variables.courseId] });
    },
  });
}

export function useAdminDeleteModule(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, courseId }: { moduleId: string; courseId: string }) =>
      adminDeleteModule(supabase, moduleId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "courseDetail", variables.courseId] });
    },
  });
}

// ─── Lessons ───

export function useAdminCreateLesson(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      module_id: string; course_id: string; title: string; type: string;
      duration_text: string; sort_order: number; video_url?: string;
      content?: string; bunny_video_id?: string;
    }) => adminCreateLesson(supabase, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "courseDetail", variables.course_id] });
      qc.invalidateQueries({ queryKey: ["admin", "courses"] });
    },
  });
}

export function useAdminUpdateLesson(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, updates, courseId }: { lessonId: string; updates: Partial<Omit<Lesson, "id" | "course_id">>; courseId: string }) =>
      adminUpdateLesson(supabase, lessonId, updates),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "courseDetail", variables.courseId] });
    },
  });
}

export function useAdminDeleteLesson(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, courseId }: { lessonId: string; courseId: string }) =>
      adminDeleteLesson(supabase, lessonId, courseId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "courseDetail", variables.courseId] });
      qc.invalidateQueries({ queryKey: ["admin", "courses"] });
    },
  });
}

// ─── Quiz Questions ───

export function useAdminQuizQuestions(supabase: SupabaseClient, lessonId: string | null) {
  return useQuery({
    queryKey: ["admin", "quizQuestions", lessonId],
    queryFn: () => adminGetQuizQuestions(supabase, lessonId!),
    enabled: !!lessonId,
  });
}

export function useAdminUpsertQuizQuestion(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id?: string; lesson_id: string; question: string;
      options: string[]; correct_index: number; explanation?: string;
    }) => adminUpsertQuizQuestion(supabase, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "quizQuestions", variables.lesson_id] });
    },
  });
}

export function useAdminDeleteQuizQuestion(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, lessonId }: { questionId: string; lessonId: string }) =>
      adminDeleteQuizQuestion(supabase, questionId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "quizQuestions", variables.lessonId] });
    },
  });
}

// ─── Thumbnail Library ───

export function useAdminThumbnailLibrary(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["admin", "thumbnail-library"],
    queryFn: () => adminGetThumbnailLibrary(supabase),
  });
}

// ─── Video Library (Bunny.net) ───

export function useAdminVideoLibrary() {
  return useQuery({
    queryKey: ["admin", "video-library"],
    queryFn: () => adminGetVideoLibrary(),
    staleTime: 30_000,
  });
}

// ─── Instructors ───

export function useAdminInstructors(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["admin", "instructors"],
    queryFn: () => adminGetInstructors(supabase),
  });
}

export function useAdminCreateInstructor(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (instructor: { name: string; handle: string; avatar_text: string; avatar_color: string; role: string; bio?: string; specialization?: string }) =>
      adminCreateInstructor(supabase, instructor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "instructors"] });
    },
  });
}

export function useAdminUpdateInstructor(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ instructorId, updates }: { instructorId: string; updates: Record<string, unknown> }) =>
      adminUpdateInstructor(supabase, instructorId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "instructors"] });
    },
  });
}

// ─── Podcasts ───

export function useAdminPodcasts(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["admin", "podcasts"],
    queryFn: () => adminGetPodcasts(supabase),
  });
}

export function useAdminCreatePodcast(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string; guest?: string; duration: string;
      publish_date?: string; status?: string; audio_url?: string; description?: string;
    }) => adminCreatePodcast(supabase, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "podcasts"] });
    },
  });
}

export function useAdminUpdatePodcast(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ podcastId, updates }: { podcastId: string; updates: Partial<Omit<AdminPodcast, "id" | "created_at">> }) =>
      adminUpdatePodcast(supabase, podcastId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "podcasts"] });
    },
  });
}

export function useAdminDeletePodcast(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (podcastId: string) => adminDeletePodcast(supabase, podcastId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "podcasts"] });
    },
  });
}

// ─── Course Students ───

export function useAdminCourseStudents(supabase: SupabaseClient, courseId: string | null) {
  return useQuery({
    queryKey: ["admin", "courseStudents", courseId],
    queryFn: () => adminGetCourseStudents(supabase, courseId!),
    enabled: !!courseId,
  });
}

export function useAdminModActions(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["admin", "modActions"],
    queryFn: () => adminGetModActions(supabase),
  });
}

export function useAdminCourseAnalytics(supabase: SupabaseClient, courseId: string | null) {
  return useQuery({
    queryKey: ["admin", "courseAnalytics", courseId],
    queryFn: () => adminGetCourseAnalytics(supabase, courseId!),
    enabled: !!courseId,
    staleTime: 30_000,
  });
}

export function useAdminAcademyOverviewStats(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["admin", "academyOverviewStats"],
    queryFn: () => adminGetAcademyOverviewStats(supabase),
    staleTime: 30_000,
  });
}

// ─── App Settings ───

export function useProSubscriptionConfig(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["admin", "proSubscriptionConfig"],
    queryFn: () => getProSubscriptionConfig(supabase),
    staleTime: 60_000,
  });
}
