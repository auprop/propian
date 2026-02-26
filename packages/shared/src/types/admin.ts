export interface AdminStats {
  totalUsers: number;
  activeUsers7d: number;
  totalPosts: number;
  totalFirms: number;
  totalReviews: number;
  pendingReports: number;
  bannedUsers: number;
  shadowbannedUsers: number;
}

export interface PostReport {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  reporter_id: string;
  reason: "spam" | "harassment" | "illegal" | "bullying" | "misinformation" | "other";
  description: string | null;
  status: "pending" | "resolved" | "dismissed";
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  // Joined fields
  post?: {
    id: string;
    content: string;
    user_id: string;
    profiles?: { username: string; display_name: string };
  };
  comment?: {
    id: string;
    content: string;
    user_id: string;
    profiles?: { username: string; display_name: string };
  };
  reporter?: { username: string; display_name: string };
}

export interface ModAction {
  id: string;
  admin_id: string;
  action: string;
  target_type: "user" | "post" | "comment" | "review" | "report";
  target_id: string;
  reason: string | null;
  created_at: string;
  admin?: { username: string; display_name: string };
}

export interface AutoModRule {
  id: string;
  name: string;
  description: string | null;
  pattern: string | null;
  action: "hide" | "flag" | "block" | "mute" | "hold";
  action_detail: string | null;
  matches_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComparisonFeature {
  id: string;
  name: string;
  type: "range" | "%" | "days" | "multi" | "select" | "bool" | "text";
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface AlgorithmConfig {
  id: string;
  key: string;
  value: string;
  category: "weight" | "signal" | "rule";
  description: string | null;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
}

// ─── Academy Admin Types ───

import type { Course, CourseModule, Lesson, Instructor } from "./academy";

export interface AdminPodcast {
  id: string;
  title: string;
  guest: string | null;
  duration: string;
  plays_count: number;
  publish_date: string | null;
  status: "draft" | "scheduled" | "published";
  audio_url: string | null;
  description: string | null;
  created_at: string;
}

export interface AdminCourseDetail extends Course {
  modules: (CourseModule & { lessons: Lesson[] })[];
  instructor: Instructor;
}

export interface AdminCourseStudent {
  user_id: string;
  course_id: string;
  enrolled_at: string;
  progress_pct: number;
  completed_at: string | null;
  /** Joined */
  user?: { display_name: string; username: string; avatar_url: string | null };
}

export interface BunnyVideoResponse {
  videoId: string;
  libraryId: number;
  status: number;
  tusEndpoint: string;
  authSignature: string;
  authExpire: number;
  embedUrl: string;
}

export interface BunnyLibraryVideo {
  guid: string;
  title: string;
  dateUploaded: string;
  length: number;
  status: number;
  encodeProgress: number;
  width: number;
  height: number;
  thumbnailUrl: string | null;
}

export interface AdminCourseAnalytics {
  enrolledCount: number;
  activeLearners: number;
  certificatesIssued: number;
  completionRate: number;
  enrolledThisWeek: number;
  lessonDropOff: Array<{
    lessonId: string;
    lessonTitle: string;
    completedCount: number;
    completionPct: number;
  }>;
}

export interface AdminAcademyOverviewStats {
  uniqueStudents: number;
  totalEnrollments: number;
  overallCompletionRate: number;
  totalCertificates: number;
  enrollmentByCourse: Record<string, number>;
  lessonsByCourse: Record<string, number>;
}

export type AdminNavSection =
  | "overview"
  | "marketing"
  | "journeys"
  | "analytics"
  | "health"
  | "security"
  | "academy"
  | "directory"
  | "comparison"
  | "users"
  | "algorithm"
  | "moderation";
