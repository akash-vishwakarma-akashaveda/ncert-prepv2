export interface Video {
  youtube_id: string;
  class_display: string;
  class_sort: string;
  subject: string;
  textbook: string;
  chapter_id: string;
  chapter_name: string;
  video_title: string;
  duration_seconds?: number;
  isActive: boolean;
  isPremium: boolean;
  pyq_available?: boolean;
  created_at?: number | string;
  /** Sheet-owned: false while the YouTube upload is not public yet ("YT Vid Published" != PUBLISH_OK). Students never see it. */
  yt_public?: boolean;
  /** Sheet-owned: NCERT chapter PDF ("url" column). */
  pdf_url?: string;
  /** Sheet-owned: "mm:ss - topic" lines, one per line ("Timestamps" column). */
  timestamps?: string;
}

export interface User {
  userId: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
  role?: 'student' | 'admin';
  grade_preference?: string;
  study_goal_minutes?: number;
  streak_days?: number;
  last_active_date?: string;
  reminders_enabled: boolean;
  reminder_frequency: 'daily' | 'weekly';
  // IST hour 0-23 the reminder email is sent.
  reminder_hour?: number;
  last_watched_video: string | null;
  onboarding_completed?: boolean;
  focus_subjects?: string[];
  xp?: number;
  level?: number;
  created_at?: string | number;
  /** DPDP consent, written only by Cloud Functions (demo: locally). Missing = not given yet. */
  consent?: UserConsent;
}

export interface UserConsent {
  status: 'granted' | 'pending_parent';
  age_group: 'adult' | 'child';
  method: 'self' | 'parent';
  notice_version: string;
  language?: 'en' | 'hi';
  parent_name?: string;
  parent_email?: string;
  granted_at?: unknown;
  requested_at?: unknown;
}

export interface UserProgress {
  youtube_id: string;
  completed: boolean;
  favorited: boolean;
  last_viewed: number | string;
}

export interface Feedback {
  feedbackId?: string;
  userId: string;
  userEmail?: string;
  youtube_id: string;
  videoTitle?: string;
  message: string;
  rating?: number;
  status?: 'new' | 'reviewed';
  created_at: number | string;
}

export interface SearchResult {
  item: Video;
  score?: number;
  matches?: Array<{
    key: string;
    value: string;
    indices: readonly [number, number][];
  }>;
}

export interface ClassGroup {
  class_display: string;
  class_sort: string;
  subjects: string[];
  videoCount: number;
}

export interface SubjectGroup {
  name: string;
  textbook?: string;
  chapters: ChapterGroup[];
  videoCount: number;
}

export interface ChapterGroup {
  key: string;
  class_sort: string;
  subject: string;
  textbook?: string;
  chapter_id: string;
  chapter_name: string;
  videos: Video[];
}

// ---- Curriculum hierarchy (admin-managed overlay on top of synced videos) ----
export interface CurriculumClass {
  id: string; // class_sort, e.g. "09"
  class_sort: string;
  name: string;
  order: number;
  isActive: boolean;
  description?: string;
}

export interface CurriculumSubject {
  id: string; // `${class_sort}_${slug(subject)}`
  class_sort: string;
  name: string; // must match videos.subject
  textbook?: string;
  order: number;
  isActive: boolean;
}

export interface CurriculumChapter {
  id: string; // chapterKey(class_sort, subject, chapter_id, textbook)
  class_sort: string;
  subject: string;
  textbook?: string; // must match videos.textbook; one subject can have several books
  chapter_id: string; // must match videos.chapter_id
  chapter_name: string;
  order: number;
  isActive: boolean;
}

// ---- Notes & cheat sheets ----
export interface NoteAttachment {
  name: string;
  url: string;
  path: string;
  contentType: string;
  size: number;
  uploaded_at: number;
}

export interface ChapterNotes {
  id: string; // chapter key
  class_sort: string;
  subject: string;
  chapter_id: string;
  chapter_name: string;
  title: string;
  summary: string;
  key_points: string[];
  formulas: string[];
  exam_tips: string[];
  attachments: NoteAttachment[];
  isPublished: boolean;
  updated_at: number;
  updated_by?: string | null;
}

export interface NotesTarget {
  class_sort: string;
  subject: string;
  textbook?: string;
  chapter_id: string;
  chapter_name: string;
}

// ---- Doubts (private student ↔ admin Q&A) ----
export type DoubtStatus = 'open' | 'answered' | 'closed';

export interface Doubt {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  class_sort: string;
  subject: string;
  chapter_id: string;
  chapter_name: string;
  youtube_id: string;
  video_title: string;
  question: string;
  status: DoubtStatus;
  answer: string | null;
  answered_by: string | null;
  answered_at: number | null;
  student_unread: boolean;
  created_at: number;
  updated_at: number;
}

// ---- Leaderboard (class-scoped student XP rankings) ----
export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  class_sort: string;
  xp: number;
  completedCount: number;
  streak_days: number;
  level: number;
  last_active_date?: string;
  avatarSeed?: string;
  photoURL?: string | null;
  updated_at: number;
}

// ---- XP Credits & History Ledger ----
export type XpSourceType =
  | 'lesson_completed'
  | 'lesson_uncompleted'
  | 'focus_session'
  | 'streak_bonus'
  | 'notes_revision'
  | 'doubt_asked'
  | 'welcome_bonus';

export interface XpTransaction {
  id: string;
  userId: string;
  amount: number; // e.g. +50, +25, +20, or -50 if reverted
  type: XpSourceType;
  description: string;
  sourceId?: string; // e.g. youtube_id or date key
  class_sort?: string; // Academic class where XP was earned, e.g. '10', '09'
  timestamp: number;
  balanceAfter: number;
}

