/* ─── Academy Types ─── */

/** Course difficulty level */
export type CourseLevel = "beginner" | "intermediate" | "advanced";

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
  thumbnail_color: string;
  instructor_id: string;
  created_at: string;
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
