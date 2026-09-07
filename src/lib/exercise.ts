import type { Stage } from '../api/types'

/**
 * The API sends `blankedText` but never an answer key, so answers are derived
 * client-side by aligning it against the full verse text.
 */

/** The backend's blank marker, as it appears in `blankedText`. */
export const BLANK = '____'

/** Word core: letters, digits, apostrophes and hyphens — matches the backend's
    exerciseBuilder, so the two tokenize identically. */
const WORD_RE = /[\p{L}\p{N}'’-]+/u

export interface TextSegment {
  kind: 'text'
  raw: string
}

export interface BlankSegment {
  kind: 'blank'
  punctBefore: string
  /** The hidden remainder of the word — sizes the rendered gap. */
  hidden: string
  punctAfter: string
  /** The word the user must supply (original casing, no punctuation). */
  answer: string
  /** The complete original token, rendered once the blank is filled. */
  filledRaw: string
}

export type ExerciseSegment = TextSegment | BlankSegment

/** Both texts came from the same source split on whitespace, so token indexes
    correspond 1:1. */
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

export type VerseChunk =
  | { kind: 'text'; text: string }
  | { kind: 'blank'; blankIndex: number; blank: BlankSegment }

/** `parseExercise`, with the blanks also collected in fill order. */
export function splitIntoChunks(
  blankedText: string,
  fullText: string,
): { chunks: VerseChunk[]; blanks: BlankSegment[] } {
  const blanks: BlankSegment[] = []
  const chunks = parseExercise(blankedText, fullText).map(
    (segment): VerseChunk => {
      if (segment.kind === 'text') return { kind: 'text', text: segment.raw }
      blanks.push(segment)
      return { kind: 'blank', blankIndex: blanks.length - 1, blank: segment }
    },
  )
  return { chunks, blanks }
}

/** Curly quotes and apostrophes are the same character to a reader. */
const canonWord = (w: string) => w.replace(/’/g, "'")

export function wordsMatch(a: string, b: string): boolean {
  return canonWord(a).toLowerCase() === canonWord(b).toLowerCase()
}

/** As `wordsMatch`, but casing has to agree too. */
export function wordsMatchExactly(a: string, b: string): boolean {
  return canonWord(a) === canonWord(b)
}

/** Case, punctuation and extra whitespace don't count against recall. */
export function normalizeTypedText(text: string): string {
  return text
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Fisher-Yates, leaving the input alone. */
export function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function randomIndex(exclusiveMax: number): number {
  return Math.floor(Math.random() * exclusiveMax)
}

/** Display-only mirrors of the API's `stageMachine.ts` — they must agree with
    it, so they live here rather than at call sites. */
export const TIER_ADVANCE_THRESHOLD = 3
export const TIER_DOWNGRADE_THRESHOLD = 2
export const REVIEW_ADVANCE_THRESHOLD = 3
export const REVIEW_DEMOTION_THRESHOLD = 2

/** The review interval ladder, in days. */
export const INTERVAL_PROGRESSION = [1, 3, 7, 14, 30]

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

export const STAGE_SHORT_LABELS: Record<Stage, string> = {
  learning_light: 'Easy',
  learning_medium: 'Medium',
  learning_heavy: 'Hard',
  review: 'Memorized',
  mastered: 'Mastered',
}

/** One wrong tap forgiven per this many blanks, so a 75-blank review exercise
    isn't graded as harshly per-slip as a 4-blank learning one. */
export const TILE_SLIP_PER_BLANKS = 20

export function missTolerance(blankCount: number): number {
  return Math.floor(blankCount / TILE_SLIP_PER_BLANKS)
}

/** Every stage but the gentlest: at `learning_light` the words themselves are
    still new, so the reference would be a second unlearned thing at once. */
export function usesReferencePhase(stage: Stage): boolean {
  return stage !== 'learning_light'
}

/** Tracked against its own budget rather than the text's, since a short
    exercise earns no slip from `missTolerance` at all. */
export const REFERENCE_SLIP_PER_STEP = 1
