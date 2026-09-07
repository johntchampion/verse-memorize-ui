import type { VerseListItem } from '../api/types'

const SNIPPET_CHARS = 60

export function truncate(text: string): string {
  if (text.length <= SNIPPET_CHARS) return text
  const cut = text.slice(0, SNIPPET_CHARS)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 1))}…`
}

/**
 * A verse parked for relearning still reports `status: 'review'`, so it has to
 * be excluded explicitly or it counts as memorized on its way back to practice.
 */
export function isMemorized(verse: VerseListItem): boolean {
  if (verse.needsRelearning) return false
  return verse.status === 'review' || verse.status === 'mastered'
}
