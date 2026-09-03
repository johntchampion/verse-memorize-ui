import type { VerseListItem } from '../api/types'

/**
 * Shared reading of the verse list — the questions more than one screen asks
 * about a verse it is only showing, not practicing.
 */

/** Snippet length that keeps a card to a single quoted line or two. */
const SNIPPET_CHARS = 60

/** Clips a verse to its opening, breaking on a word rather than mid-syllable. */
export function truncate(text: string): string {
  if (text.length <= SNIPPET_CHARS) return text
  const cut = text.slice(0, SNIPPET_CHARS)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 1))}…`
}

/**
 * A verse is "memorized" once it has graduated out of the learning slots —
 * but not while it's queued for relearning. Such a verse still reports
 * `status: 'review'` (status is derived from `stage`, which doesn't change
 * while it's parked), so it would otherwise be counted as memorized while
 * actually being on its way back into practice.
 */
export function isMemorized(verse: VerseListItem): boolean {
  if (verse.needsRelearning) return false
  return verse.status === 'review' || verse.status === 'mastered'
}
