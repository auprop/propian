/* ─── Academy Types ─── */

/** Course difficulty level */
export type CourseLevel = "beginner" | "intermediate" | "advanced";

/** Course pricing model */
export type CoursePriceType = "free" | "one_time" | "pro_only";

/** Lesson content type */
export type LessonType = "video" | "article" | "quiz";

/** All possible academy sub-views */
export type AcademyView =
  | "catalog"
  | "course"
  | "lesson"
  | "quiz"
  | "path"
  | "certificates"
  | "instructor";

/* ─── Content (seed data, public read) ─── */

export interface Instructor {
  id: string;
  name: string;
  handle: string;
  avatar_text: string;
  avatar_color: string;
  role: string;
  bio: string | null;
  location: string | null;
  joined_date: string;
  specialization: string | null;
  is_verified: boolean;
  /** Computed / joined */
  courses_count?: number;
  students_count?: number;
  rating_avg?: number;
  review_count?: number;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  level: CourseLevel;
  lessons_count: number;
  duration_text: string;
  students_count: number;
  price: string;
  price_type: CoursePriceType;
  price_cents: number;
  thumbnail_color: string;
  instructor_id: string;
  created_at: string;
  /** New fields (migration 048) */
  status?: string;
  category?: string | null;
  tags?: string[] | null;
  thumbnail_url?: string | null;
  certificate_enabled?: boolean;
  /** Stripe product/price IDs (migration 052) */
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  /** Joined */
  instructor?: Instructor;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
}

export interface Lesson {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  type: LessonType;
  duration_text: string;
  sort_order: number;
  video_url: string | null;
  content: string | null;
  /** Bunny.net Stream video GUID (migration 048) */
  bunny_video_id?: string | null;
}

export interface QuizQuestion {
  id: string;
  lesson_id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string | null;
  /** Joined */
  courses?: LearningPathCourse[];
}

export interface LearningPathCourse {
  path_id: string;
  course_id: string;
  sort_order: number;
  /** Joined */
  course?: Course;
}

/* ─── Per-user data (auth-gated) ─── */

export interface UserCourseProgress {
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  progress_pct: number;
  current_lesson_id: string | null;
  /** Joined */
  course?: Course;
}

export interface UserLessonProgress {
  user_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
}

export interface UserQuizAttempt {
  id: string;
  user_id: string;
  lesson_id: string;
  score: number;
  passed: boolean;
  answers: number[];
  attempted_at: string;
}

export interface UserNote {
  id: string;
  user_id: string;
  lesson_id: string;
  content: string;
  updated_at: string;
}

export interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  certificate_code: string;
  issued_at: string;
  /** Joined */
  course?: Course;
  instructor?: Instructor;
}

export interface InstructorReview {
  id: string;
  instructor_id: string;
  user_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  /** Joined */
  user?: { display_name: string; username: string; avatar_url: string | null };
}

/* ─── Computed / aggregated ─── */

export interface AcademyStats {
  courses_completed: number;
  hours_learned: number;
  current_streak: number;
  certificates_earned: number;
}

export interface LearningStats {
  activityDates: string[];
  totalMinutes: number;
}

/* ─── Payments ─── */

export interface Purchase {
  id: string;
  user_id: string;
  course_id: string;
  stripe_session_id: string;
  stripe_payment_intent: string | null;
  amount_cents: number;
  currency: string;
  status: "pending" | "completed" | "refunded" | "failed";
  created_at: string;
  completed_at: string | null;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: "active" | "past_due" | "canceled" | "trialing" | "incomplete" | "unpaid";
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}
