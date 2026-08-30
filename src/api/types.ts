/**
 * Mirrors the response shapes of verse-memorize-api. Snake_case fields come
 * straight from database rows the API returns verbatim (user_verse, attempt);
 * camelCase fields are API-composed.
 *
 * The progression model itself is specified in the API's README — this file
 * only mirrors its wire format.
 */

export type Stage =
  | 'learning_light'
  | 'learning_medium'
  | 'learning_heavy'
  | 'review'
  | 'mastered'

export type ExerciseType = 'tile_fill_blank' | 'type_fill_blank'

export type VerseStatus = 'locked' | 'active' | 'review' | 'mastered'

/**
 * A `user_verse` row, returned verbatim. It holds both the learning-tier state
 * and the review schedule — a verse is only ever in one regime at a time, so
 * there is no separate schedule row.
 */
export interface UserVerse {
  id: string
  user_id: string
  verse_id: string
  stage: Stage
  /** Zeroed by any wrong answer. In a learning tier the run must also land
      inside one calendar day — see `streak_date`. */
  consecutive_correct: number
  /** Zeroed by any correct answer. May span days. */
  consecutive_incorrect: number
  /** Local date `consecutive_correct` was accrued on; learning stages only. */
  streak_date: string | null
  /** review/mastered only; null in a learning slot or while queued. */
  interval_days: number | null
  /** Local date (YYYY-MM-DD); null = not scheduled. */
  due_at: string | null
  /** Local dates capping tier changes at one per day, either direction. */
  last_upgrade_date: string | null
  last_downgrade_date: string | null
  /** 1 = pulled out of review, waiting for a learning slot to free up. */
  needs_relearning: 0 | 1
  relearning_queued_at: string | null
  /** 1, 2 or 3 while in an active learning slot; null once graduated. */
  slot: number | null
  activated_at: string
  /** Graduation is an event stamped here, not a stage of its own. */
  graduated_at: string | null
}

/** Scheduling for a verse in review, composed by GET /api/verses/:id. */
export interface VerseSchedule {
  /** Local date (YYYY-MM-DD). */
  dueAt: string
  intervalDays: number | null
}

export interface Attempt {
  id: string
  user_verse_id: string
  exercise_type: ExerciseType
  correct: 0 | 1
  created_at: string
}

// POST /auth/signup, POST /auth/login
export interface AuthResponse {
  token: string
  userId: string
}

// GET /api/me
export interface SlotVerse {
  slot: number | null
  userVerseId: string
  verseId: string
  reference: string | null
  stage: Stage
  consecutiveCorrect: number
  consecutiveIncorrect: number
  /** Local date the correct-run was accrued on; a run from an earlier day no
      longer counts toward advancing. */
  streakDate: string | null
  /** This verse already changed tier today, so it can't change again until
      tomorrow. */
  tierChangeUsedToday: boolean
}

export interface MeResponse {
  user: {
    id: string
    email: string
    timezone: string
    translation: string
    createdAt: string
  }
  streak: number
  completedToday: boolean
  sessionsCompleted: number
  versesStarted: number
  slots: {
    max: number
    unlocked: number
    active: SlotVerse[]
  }
}

// GET /api/session/today
export interface SessionExercise {
  verseId: string
  userVerseId: string
  exerciseType: ExerciseType
  reference: string
  blankedText: string
  /** Empty for typed exercises — there are no tiles to show. */
  wordBank: string[]
  stage: Stage
  queue: 'review' | 'learning'
}

export interface SessionTodayResponse {
  translation: string
  exercises: SessionExercise[]
  count: number
}

// POST /api/attempt
export interface AttemptOutcome {
  userVerse: UserVerse
  /** True when this attempt graduated the verse out of learning_heavy. */
  graduated: boolean
  /** Rows slotted by the refill this attempt triggered. A row with a
      `graduated_at` is a verse returning to practice, not a new one. */
  slotsFilled: UserVerse[]
}

// POST /api/session/complete
export interface SessionCompleteResponse {
  recorded: boolean
  sessionsCompleted: number
  slotsFilled: UserVerse[]
}

// GET /api/verses
export interface VerseListItem {
  id: string
  reference: string
  order: number
  status: VerseStatus
  stage: Stage | null
  /** Pulled out of review and parked until a slot opens. Such a verse still
      reports `status: 'review'`, so this has to be checked alongside it. */
  needsRelearning: boolean
  slot: number | null
  graduatedAt: string | null
  /** null while the verse is locked — the API withholds the text. */
  text: string | null
}

export interface VersesResponse {
  translation: string
  verses: VerseListItem[]
}

// GET /api/verses/:id
export interface VerseDetailResponse {
  translation: string
  verse: {
    id: string
    reference: string
    order: number
    text: string | null
  }
  status: VerseStatus
  graduatedAt: string | null
  userVerse: UserVerse | null
  schedule: VerseSchedule | null
  history: {
    attempts: Attempt[]
    total: number
    correct: number
  }
}

// GET /api/translations
export interface TranslationOption {
  code: string
  name: string
  license: string
}

export interface TranslationsResponse {
  translations: TranslationOption[]
  default: string
}
