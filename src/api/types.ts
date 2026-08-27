/**
 * Mirrors the response shapes of verse-memorize-api. Snake_case fields come
 * straight from database rows the API returns verbatim (user_verse, attempt,
 * review_schedule); camelCase fields are API-composed.
 */

export type Stage =
  | 'learning_light'
  | 'learning_medium'
  | 'learning_heavy'
  | 'review'
  | 'mastered'
  | 'decayed';

export type ExerciseType = 'tile_fill_blank' | 'type_fill_blank';

export type VerseStatus = 'locked' | 'active' | 'review' | 'mastered';

export interface UserVerse {
  id: string;
  user_id: string;
  verse_id: string;
  stage: Stage;
  strength: number;
  correct_streak_in_tier: number;
  slot: number | null;
  activated_at: string;
  graduated_at: string | null;
}

export interface ReviewSchedule {
  id: string;
  user_verse_id: string;
  due_at: string;
  interval_days: number;
}

export interface Attempt {
  id: string;
  user_verse_id: string;
  exercise_type: ExerciseType;
  correct: 0 | 1;
  created_at: string;
}

// POST /auth/signup, POST /auth/login
export interface AuthResponse {
  token: string;
  userId: string;
}

// GET /api/me
export interface SlotVerse {
  slot: number | null;
  userVerseId: string;
  verseId: string;
  reference: string | null;
  stage: Stage;
  correctStreakInTier: number;
}

export interface MeResponse {
  user: {
    id: string;
    email: string;
    timezone: string;
    createdAt: string;
  };
  streak: number;
  sessionsCompleted: number;
  versesStarted: number;
  slots: {
    max: number;
    unlocked: number;
    active: SlotVerse[];
  };
}

// GET /api/session/today
export interface SessionExercise {
  verseId: string;
  userVerseId: string;
  exerciseType: ExerciseType;
  reference: string;
  blankedText: string;
  /** Empty for typed exercises — there are no tiles to show. */
  wordBank: string[];
  stage: Stage;
  queue: 'review' | 'learning';
}

export interface SessionTodayResponse {
  exercises: SessionExercise[];
  count: number;
}

// POST /api/attempt
export interface AttemptOutcome {
  userVerse: UserVerse;
  schedule: ReviewSchedule | null;
  graduated: boolean;
  slotsFilled: UserVerse[];
}

// POST /api/session/complete
export interface SessionCompleteResponse {
  recorded: boolean;
  sessionsCompleted: number;
  slotsFilled: UserVerse[];
}

// GET /api/verses
export interface VerseListItem {
  id: string;
  reference: string;
  order: number;
  status: VerseStatus;
  stage: Stage | null;
  decayed: boolean;
  strength: number;
  slot: number | null;
  graduatedAt: string | null;
  /** null while the verse is locked — the API withholds the text. */
  text: string | null;
}

export interface VersesResponse {
  verses: VerseListItem[];
}

// GET /api/verses/:id
export interface VerseDetailResponse {
  verse: {
    id: string;
    reference: string;
    order: number;
    text: string | null;
  };
  status: VerseStatus;
  graduatedAt: string | null;
  userVerse: UserVerse | null;
  schedule: ReviewSchedule | null;
  history: {
    attempts: Attempt[];
    total: number;
    correct: number;
  };
}
