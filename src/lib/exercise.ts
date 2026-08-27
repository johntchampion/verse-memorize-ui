import type { Stage } from '../api/types';

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

const BLANK = '____';

/** Same word-core pattern as the backend's exerciseBuilder. */
const WORD_RE = /[\p{L}\p{N}'’-]+/u;

export interface TextSegment {
  kind: 'text';
  raw: string;
}

export interface BlankSegment {
  kind: 'blank';
  /** Punctuation before the word, e.g. the quote in `"Do`. */
  punctBefore: string;
  /** First letter revealed at the learning_heavy tier; '' otherwise. */
  shownLetter: string;
  /** The hidden remainder of the word — sizes the rendered gap. */
  hidden: string;
  /** Punctuation after the word, e.g. the comma in `anything,`. */
  punctAfter: string;
  /** The word the user must supply (original casing, no punctuation). */
  answer: string;
  /** The complete original token, rendered once the blank is filled. */
  filledRaw: string;
}

export type ExerciseSegment = TextSegment | BlankSegment;

/**
 * Aligns `blankedText` with `fullText` token-by-token. Both came from the same
 * source split on whitespace, so indexes correspond 1:1.
 */
export function parseExercise(blankedText: string, fullText: string): ExerciseSegment[] {
  const blankedTokens = blankedText.split(/\s+/).filter(Boolean);
  const fullTokens = fullText.split(/\s+/).filter(Boolean);

  if (blankedTokens.length !== fullTokens.length) {
    throw new Error('exercise text does not align with verse text');
  }

  return blankedTokens.map((token, i): ExerciseSegment => {
    const blankAt = token.indexOf(BLANK);
    if (blankAt === -1) return { kind: 'text', raw: token };

    const fullRaw = fullTokens[i];
    const match = WORD_RE.exec(fullRaw);
    if (!match) return { kind: 'text', raw: fullRaw };

    const answer = match[0];
    const punctBefore = fullRaw.slice(0, match.index);
    const shownLetter = token.slice(punctBefore.length, blankAt);

    return {
      kind: 'blank',
      punctBefore,
      shownLetter,
      hidden: answer.slice(shownLetter.length),
      punctAfter: fullRaw.slice(match.index + answer.length),
      answer,
      filledRaw: fullRaw,
    };
  });
}

/** Case-insensitive, curly-quote-tolerant comparison for single bank words. */
export function wordsMatch(a: string, b: string): boolean {
  const canon = (w: string) => w.toLowerCase().replace(/’/g, "'");
  return canon(a) === canon(b);
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
    .trim();
}

export const STAGE_LABELS: Record<Stage, string> = {
  learning_light: 'Light blanks',
  learning_medium: 'Medium blanks',
  learning_heavy: 'Heavy blanks',
  review: 'In review',
  mastered: 'Mastered',
  decayed: 'Needs review',
};

/** Toast copy for a stage transition observed in an attempt response. */
export function stageChangeMessage(from: Stage, to: Stage): string | null {
  if (from === to) return null;
  switch (to) {
    case 'learning_medium':
      return 'Nice — moving to medium blanks';
    case 'learning_heavy':
      return 'Nice — moving to heavy blanks';
    case 'review':
      if (from === 'learning_heavy') return 'Graduated! Now in review';
      if (from === 'decayed') return 'Back on track — review restored';
      return 'Back in review';
    case 'mastered':
      return 'Mastered — well kept';
    case 'decayed':
      return 'This one slipped — flagged for extra review';
    default:
      return null;
  }
}
