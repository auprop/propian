"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CourseLevel } from "../types";
import * as academyApi from "../api/academy";

/* ─── Read Hooks ─── */

/** Fetch all courses, optionally by level */
export function useCourses(supabase: SupabaseClient, level?: CourseLevel) {
  return useQuery({
    queryKey: ["academy-courses", level ?? "all"],
    queryFn: () => academyApi.getCourses(supabase, level),
    staleTime: 10 * 60_000, // 10 min — course catalog is static content
  });
}

/** Fetch a single course by slug */
export function useCourse(supabase: SupabaseClient, slug: string | null) {
  return useQuery({
    queryKey: ["academy-course", slug],
    queryFn: () => academyApi.getCourse(supabase, slug!),
    enabled: !!slug,
    staleTime: 10 * 60_000,
  });
}

/** Fetch modules for a course */
export function useCourseModules(
  supabase: SupabaseClient,
  courseId: string | null,
) {
  return useQuery({
    queryKey: ["academy-modules", courseId],
    queryFn: () => academyApi.getCourseModules(supabase, courseId!),
    enabled: !!courseId,
    staleTime: 10 * 60_000,
  });
}

/** Fetch all lessons for a course */
export function useCourseLessons(
  supabase: SupabaseClient,
  courseId: string | null,
) {
  return useQuery({
    queryKey: ["academy-lessons", courseId],
    queryFn: () => academyApi.getCourseLessons(supabase, courseId!),
    enabled: !!courseId,
    staleTime: 10 * 60_000,
  });
}

/** Fetch quiz questions for a lesson */
export function useQuizQuestions(
  supabase: SupabaseClient,
  lessonId: string | null,
) {
  return useQuery({
    queryKey: ["academy-quiz", lessonId],
    queryFn: () => academyApi.getQuizQuestions(supabase, lessonId!),
    enabled: !!lessonId,
    staleTime: 10 * 60_000,
  });
}

/** Fetch all instructors */
export function useInstructors(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["academy-instructors"],
    queryFn: () => academyApi.getInstructors(supabase),
    staleTime: 10 * 60_000,
  });
}

/** Fetch a single instructor */
export function useInstructor(
  supabase: SupabaseClient,
  instructorId: string | null,
) {
  return useQuery({
    queryKey: ["academy-instructor", instructorId],
    queryFn: () => academyApi.getInstructor(supabase, instructorId!),
    enabled: !!instructorId,
  });
}

/** Fetch courses by instructor */
export function useInstructorCourses(
  supabase: SupabaseClient,
  instructorId: string | null,
) {
  return useQuery({
    queryKey: ["academy-instructor-courses", instructorId],
    queryFn: () => academyApi.getInstructorCourses(supabase, instructorId!),
    enabled: !!instructorId,
  });
}

/** Fetch reviews for an instructor */
export function useInstructorReviews(
  supabase: SupabaseClient,
  instructorId: string | null,
) {
  return useQuery({
    queryKey: ["academy-instructor-reviews", instructorId],
    queryFn: () => academyApi.getInstructorReviews(supabase, instructorId!),
    enabled: !!instructorId,
  });
}

/** Fetch all learning paths with courses */
export function useLearningPaths(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["academy-paths"],
    queryFn: () => academyApi.getLearningPaths(supabase),
  });
}

/** Fetch all enrolled courses for current user */
export function useUserProgress(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["academy-user-progress"],
    queryFn: () => academyApi.getUserAllProgress(supabase),
  });
}

/** Fetch progress for a single course */
export function useUserCourseProgress(
  supabase: SupabaseClient,
  courseId: string | null,
) {
  return useQuery({
    queryKey: ["academy-user-course-progress", courseId],
    queryFn: () => academyApi.getUserCourseProgress(supabase, courseId!),
    enabled: !!courseId,
  });
}

/** Fetch lesson completions for a course */
export function useUserLessonProgress(
  supabase: SupabaseClient,
  courseId: string | null,
) {
  return useQuery({
    queryKey: ["academy-user-lesson-progress", courseId],
    queryFn: () => academyApi.getUserLessonProgress(supabase, courseId!),
    enabled: !!courseId,
  });
}

/** Fetch user certificates */
export function useUserCertificates(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["academy-certificates"],
    queryFn: () => academyApi.getUserCertificates(supabase),
  });
}

/** Fetch user notes for a lesson */
export function useUserNotes(
  supabase: SupabaseClient,
  lessonId: string | null,
) {
  return useQuery({
    queryKey: ["academy-notes", lessonId],
    queryFn: () => academyApi.getUserNotes(supabase, lessonId!),
    enabled: !!lessonId,
  });
}

/** Fetch quiz attempts for a lesson */
export function useUserQuizAttempts(
  supabase: SupabaseClient,
  lessonId: string | null,
) {
  return useQuery({
    queryKey: ["academy-quiz-attempts", lessonId],
    queryFn: () => academyApi.getUserQuizAttempts(supabase, lessonId!),
    enabled: !!lessonId,
  });
}

/** Fetch learning stats (activity dates + total minutes) for current user */
export function useLearningStats(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["academy-learning-stats"],
    queryFn: () => academyApi.getUserLearningStats(supabase),
  });
}

/** Check if user has purchased a specific course */
export function useHasCoursePurchase(
  supabase: SupabaseClient,
  courseId: string | null,
) {
  return useQuery({
    queryKey: ["academy-purchase", courseId],
    queryFn: () => academyApi.hasCoursePurchase(supabase, courseId!),
    enabled: !!courseId,
  });
}

/** Fetch user's active Pro subscription */
export function useUserSubscription(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["academy-subscription"],
    queryFn: () => academyApi.getUserSubscription(supabase),
  });
}

/** Fetch user's purchase history */
export function useUserPurchases(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["academy-purchases"],
    queryFn: () => academyApi.getUserPurchases(supabase),
  });
}

/* ─── Write Hooks (Mutations) ─── */

/** Enroll in a course */
export function useEnrollCourse(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) =>
      academyApi.enrollInCourse(supabase, courseId),
    onSuccess: (_data, courseId) => {
      qc.invalidateQueries({ queryKey: ["academy-user-progress"] });
      qc.invalidateQueries({
        queryKey: ["academy-user-course-progress", courseId],
      });
    },
  });
}

/** Complete a lesson */
export function useCompleteLesson(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      lessonId,
      courseId,
    }: {
      lessonId: string;
      courseId: string;
    }) => academyApi.completeLesson(supabase, lessonId, courseId),
    onSuccess: (_data, { courseId }) => {
      qc.invalidateQueries({
        queryKey: ["academy-user-lesson-progress", courseId],
      });
      qc.invalidateQueries({
        queryKey: ["academy-user-course-progress", courseId],
      });
      qc.invalidateQueries({ queryKey: ["academy-user-progress"] });
      qc.invalidateQueries({ queryKey: ["academy-learning-stats"] });
    },
  });
}

/** Submit a quiz */
export function useSubmitQuiz(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      lessonId,
      answers,
    }: {
      lessonId: string;
      answers: number[];
    }) => academyApi.submitQuiz(supabase, lessonId, answers),
    onSuccess: (_data, { lessonId }) => {
      qc.invalidateQueries({
        queryKey: ["academy-quiz-attempts", lessonId],
      });
    },
  });
}

/** Save a lesson note */
export function useSaveNote(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      lessonId,
      content,
    }: {
      lessonId: string;
      content: string;
    }) => academyApi.saveNote(supabase, lessonId, content),
    onSuccess: (_data, { lessonId }) => {
      qc.invalidateQueries({ queryKey: ["academy-notes", lessonId] });
    },
  });
}

/** Issue a certificate */
export function useIssueCertificate(supabase: SupabaseClient) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) =>
      academyApi.issueCertificate(supabase, courseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-certificates"] });
    },
  });
}

/** Start a Stripe Checkout session and redirect */
export function useCheckout() {
  return useMutation({
    mutationFn: (params: { courseId: string } | { plan: "pro" }) =>
      academyApi.createCheckoutSession(params),
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
}

/** Open Stripe Customer Portal for subscription management */
export function useCustomerPortal() {
  return useMutation({
    mutationFn: () => academyApi.createPortalSession(),
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
}
