/**
 * Mirrors verse-memorize-api's wire format. Snake_case fields are database rows
 * returned verbatim; camelCase fields are API-composed. The progression model
 * itself is specified in the API's README.
 */

export type Stage =
  | 'learning_light'
  | 'learning_medium'
  | 'learning_heavy'
  | 'review'
  | 'mastered'

export type ExerciseType = 'tile_fill_blank' | 'type_fill_blank'

export type VerseStatus = 'not_started' | 'active' | 'review' | 'mastered'

/** A `user_verse` row: learning-tier state and review schedule together, since
    a verse is only ever in one regime at a time. */
export interface UserVerse {
  id: string
  user_id: string
  verse_id: string
  stage: Stage
  /** Zeroed by any wrong answer; in a learning tier the run must also land
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
  /** A run from an earlier day no longer counts toward advancing. */
  streakDate: string | null
  /** Already changed tier today, so it can't change again until tomorrow. */
  tierChangeUsedToday: boolean
}

export interface MeResponse {
  user: {
    id: string
    email: string
    timezone: string
    translation: string
    createdAt: string
      remindersEnabled: boolean
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

/** What a verse did during a session, as the server recorded it. */
export type SessionEventKind =
  | 'tier_up'
  | 'tier_down'
  | 'graduated'
  | 'mastered'
  | 'lost_mastery'
  | 'demoted_to_learning'
  | 'relearning_queued'
  | 'slot_filled'
  | 'slot_returned'

export interface SessionEventBody {
  id: string
  kind: SessionEventKind
  verseId: string
  /** Rendered server-side, so a slot event can name the verse. */
  reference: string
  /** Null for slot events, which aren't a move along the ladder. */
  stageFrom: Stage | null
  stageTo: Stage | null
  slot: number | null
  createdAt: string
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
  /** Already answered today. The day's plan is persisted and append-only, so
      a session picked up again resumes at the first exercise still false. */
  completed: boolean
  /** How it was answered, or null while still outstanding. */
  correct: boolean | null
  userVerse: UserVerse
}

export interface SessionTodayResponse {
  translation: string
  /** True when this is a practice drill rather than the day's plan: one
      exercise per slotted verse, counting toward nothing. */
  practice: boolean
  exercises: SessionExercise[]
  count: number
  completedCount: number
  correctCount: number
  /** The whole day, not just this client's part of it, so a resumed session
      still recaps everything. Always empty for a practice drill. */
  events: SessionEventBody[]
}

// POST /api/attempt
export interface AttemptOutcome {
  userVerse: UserVerse
  /** True when this attempt graduated the verse out of learning_heavy. */
  graduated: boolean
  /** Rows slotted by the refill this attempt triggered. A row with a
      `graduated_at` is a verse returning to practice, not a new one. */
  slotsFilled: UserVerse[]
  /** A delta, unlike session/today's whole day. A verse re-slotted by this
      attempt's own refill is reported here and not again in `slotsFilled`. */
  events: SessionEventBody[]
}

// POST /api/session/complete
export interface SessionCompleteResponse {
  recorded: boolean
  sessionsCompleted: number
  slotsFilled: UserVerse[]
  /** Just the slots this call topped up. */
  events: SessionEventBody[]
}

// GET /api/verses
export interface VerseListItem {
  id: string
  reference: string
  order: number
  status: VerseStatus
  stage: Stage | null
  /** Parked until a slot opens. Such a verse still reports `status: 'review'`,
      so this has to be checked alongside it. */
  needsRelearning: boolean
  slot: number | null
  graduatedAt: string | null
  text: string
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
    text: string
  }
  /** Themes this verse belongs to — possibly several, possibly none. */
  themes: { id: string; name: string }[]
  /** 1-based (1 = next up); null when the verse holds a slot or is memorized. */
  queuePosition: number | null
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

// GET /api/queue — the practice queue: every verse not memorized and not
// currently holding a slot, in the order slot refill will consume them.
export interface QueueVerse {
  id: string
  reference: string
  order: number
  text: string
  /** Carries saved progress (swapped out of a slot, or relearning). */
  inProgress: boolean
  relearning: boolean
  stage: Stage | null
  themeIds: string[]
}

export interface QueueTheme {
  id: string
  name: string
  /** Verses in the theme overall vs. still waiting in the queue. */
  total: number
  queuedCount: number
}

export interface QueueResponse {
  translation: string
  /** True once the user has stored a custom order. */
  customized: boolean
  queue: QueueVerse[]
  themes: QueueTheme[]
}

// POST /api/slots/replace
export interface SlotReplaceResponse extends QueueResponse {
  placed: UserVerse
  displaced: UserVerse | null
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

export interface PushKeyResponse {
  publicKey: string
}

export interface PushTestResponse {
  sent: number
  /** Endpoints the push service reported dead, now deleted. */
  removed: number
  failed: number
}

// POST /api/me/delete-account
export interface DeleteAccountResponse {
  deleted: true
}

// POST /auth/forgot-password, POST /api/me/request-password-reset.
// `requested` says the link was accepted for sending, not that it was sent —
// the API does not wait for the mail, and answers the same for an address with
// no account. POST /auth/reset-password returns an AuthResponse instead.
export interface PasswordResetRequested {
  requested: true
}
