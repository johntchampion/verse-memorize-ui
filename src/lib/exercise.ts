import type { AttemptOutcome, Stage } from '../api/types'

/**
 * Client-side exercise parsing.
 *
 * The API sends `blankedText` ("Do not be ____ about anything…") but never an
 * answer key — correctness is judged client-side and reported to
 * POST /api/attempt as a boolean. The answers are derived by aligning the
 * blanked text against the full verse text (available from GET /api/verses/:id
 * for any unlocked verse), using the same whitespace tokenization the backend
 * used to build the exercise.
 */

const BLANK = '____'

/** Same word-core pattern as the backend's exerciseBuilder. */
const WORD_RE = /[\p{L}\p{N}'’-]+/u

export interface TextSegment {
  kind: 'text'
  raw: string
}

export interface BlankSegment {
  kind: 'blank'
  /** Punctuation before the word, e.g. the quote in `"Do`. */
  punctBefore: string
  /** The hidden remainder of the word — sizes the rendered gap. */
  hidden: string
  /** Punctuation after the word, e.g. the comma in `anything,`. */
  punctAfter: string
  /** The word the user must supply (original casing, no punctuation). */
  answer: string
  /** The complete original token, rendered once the blank is filled. */
  filledRaw: string
}

export type ExerciseSegment = TextSegment | BlankSegment

/**
 * Aligns `blankedText` with `fullText` token-by-token. Both came from the same
 * source split on whitespace, so indexes correspond 1:1.
 */
export function parseExercise(
  blankedText: string,
  fullText: string,
): ExerciseSegment[] {
  const blankedTokens = blankedText.split(/\s+/).filter(Boolean)
  const fullTokens = fullText.split(/\s+/).filter(Boolean)

  if (blankedTokens.length !== fullTokens.length) {
    throw new Error('exercise text does not align with verse text')
  }

  return blankedTokens.map((token, i): ExerciseSegment => {
    const blankAt = token.indexOf(BLANK)
    if (blankAt === -1) return { kind: 'text', raw: token }

    const fullRaw = fullTokens[i]
    const match = WORD_RE.exec(fullRaw)
    if (!match) return { kind: 'text', raw: fullRaw }

    const answer = match[0]
    const punctBefore = fullRaw.slice(0, match.index)

    return {
      kind: 'blank',
      punctBefore,
      hidden: answer,
      punctAfter: fullRaw.slice(match.index + answer.length),
      answer,
      filledRaw: fullRaw,
    }
  })
}

/** Case-insensitive, curly-quote-tolerant comparison for single bank words. */
export function wordsMatch(a: string, b: string): boolean {
  const canon = (w: string) => w.toLowerCase().replace(/’/g, "'")
  return canon(a) === canon(b)
}

/**
 * Forgiving full-verse comparison for typed exercises: case, punctuation and
 * extra whitespace don't count against recall.
 */
export function normalizeTypedText(text: string): string {
  return text
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Progression thresholds, mirrored from the API's `stageMachine.ts`. They are
 * display-only here — the server is the authority on every transition — but
 * they have to agree with it, so keep them in this one place rather than at
 * call sites.
 */
export const TIER_ADVANCE_THRESHOLD = 3
export const TIER_DOWNGRADE_THRESHOLD = 2
export const REVIEW_ADVANCE_THRESHOLD = 3
export const REVIEW_DEMOTION_THRESHOLD = 2

/** The review interval ladder, in days. */
export const INTERVAL_PROGRESSION = [1, 3, 7, 14, 30]

/**
 * The full progression, in order. The first three are *slotted* — a verse in
 * one of them occupies one of the user's three active slots; `review` and
 * `mastered` are reached only by graduating out of the third.
 */
export const STAGE_SEQUENCE: Stage[] = [
  'learning_light',
  'learning_medium',
  'learning_heavy',
  'review',
  'mastered',
]

/** The three slotted tiers, in order — `learning_light` is the floor. */
export const LEARNING_ORDER: Stage[] = [
  'learning_light',
  'learning_medium',
  'learning_heavy',
]

export function isLearningStage(stage: Stage): boolean {
  return LEARNING_ORDER.includes(stage)
}

export const STAGE_LABELS: Record<Stage, string> = {
  learning_light: 'Easy - few blanks',
  learning_medium: 'Medium - half blanks',
  learning_heavy: 'Hard - tons of blanks',
  review: 'In review',
  mastered: 'Mastered',
}

/** Short label for the ladder, where the "blanks" suffix is implied. */
export const STAGE_SHORT_LABELS: Record<Stage, string> = {
  learning_light: 'Easy',
  learning_medium: 'Medium',
  learning_heavy: 'Hard',
  review: 'Memorized',
  mastered: 'Mastered',
}

/**
 * One wrong tap forgiven per this many blanks.
 *
 * A review exercise blanks every word, so a 75-word verse is 75 taps; treating
 * a single slip there the same as a slip on a 4-blank learning exercise would
 * make the two-miss review demotion far too easy to trigger. Short exercises
 * are unaffected — they don't earn a slip.
 */
export const TILE_SLIP_PER_BLANKS = 20

/** Wrong taps forgiven before a tile attempt is reported as a miss. */
export function missTolerance(blankCount: number): number {
  return Math.floor(blankCount / TILE_SLIP_PER_BLANKS)
}

/**
 * Toast copy for whatever an attempt just did to the verse.
 *
 * This needs the whole outcome, not just the two stages: when a review verse
 * fails twice and no slot is free it stays in `review` and only
 * `needs_relearning` flips, which a stage comparison can't see.
 */
export function stageChangeMessage(
  from: Stage,
  outcome: AttemptOutcome,
): string | null {
  const to = outcome.userVerse.stage

  // Parked for relearning: out of the review rotation until a slot opens.
  if (outcome.userVerse.needs_relearning === 1) {
    return 'Slipped twice — waiting for a slot to relearn'
  }

  // Demoted out of review and re-slotted straight away, because a slot was free.
  if (from === 'review' && to === 'learning_heavy') {
    return 'Back into practice at heavy blanks'
  }

  if (from === to) return null

  const fromTier = LEARNING_ORDER.indexOf(from)
  const toTier = LEARNING_ORDER.indexOf(to)
  if (fromTier !== -1 && toTier !== -1) {
    return toTier > fromTier
      ? `Nice — moving to ${STAGE_LABELS[to].toLowerCase()}`
      : `Slipped back to ${STAGE_LABELS[to].toLowerCase()}`
  }

  switch (to) {
    case 'review':
      if (from === 'learning_heavy') return 'Graduated! Now in review'
      // Only mastered falls back into review, and that miss already counts as
      // the first of review's two strikes.
      return 'Lost mastery — back in review, one strike in'
    case 'mastered':
      return 'Mastered — fully memorized'
    default:
      return null
  }
}
