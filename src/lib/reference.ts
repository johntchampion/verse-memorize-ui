import { BOOKS, bookChoices } from './books'
import { shuffle } from './exercise'

/**
 * The API sends `reference` as one display string ("1 Corinthians 15:3-4") and
 * never decomposes it, so the split, the decoys and the typed comparison are
 * all derived here. Nothing is authoritative: a reference that won't parse
 * simply turns the reference phase off.
 */

export interface ParsedReference {
  /** As written, whitespace collapsed: "1 Corinthians". */
  book: string
  /** Digits only, leading zeros dropped: "15". */
  chapter: string
  /** "3" or "3-4" — always a hyphen, never an en dash. */
  verses: string
}

/** Book, chapter and verse(s). The book group is lazy with an anchored tail so
    multi-word names land whole: "Song of Solomon 1:1" splits at the last space
    before the chapter. `\p{L}` matches the tokenizer `lib/exercise.ts` uses. */
const REFERENCE_RE =
  /^([1-3]?\s*\p{L}[\p{L}\s]*?)\s+(\d+)\s*:\s*(\d+)(?:\s*-\s*(\d+))?$/u

/** Every dash flavour a reference arrives with means "through". */
const DASHES = /[‐‑‒–—−]/g

/** One spelling of the incidentals: no odd dashes, no periods, single spaces. */
function tidy(reference: string): string {
  return reference
    .replace(DASHES, '-')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseReference(reference: string): ParsedReference | null {
  const match = REFERENCE_RE.exec(tidy(reference))
  if (!match) return null

  const [, book, chapter, start, end] = match
  // Through Number so a stray leading zero can't fail an otherwise exact match.
  const first = String(Number(start))
  const last = end === undefined ? first : String(Number(end))

  return {
    book: book.replace(/\s+/g, ' ').trim(),
    chapter: String(Number(chapter)),
    verses: last === first ? first : `${first}-${last}`,
  }
}

/**
 * Distinct positive numbers around `answer`, ascending. Which offsets get
 * picked is shuffled first: otherwise the sorted answer would land at the same
 * index every time, exactly the tell sorting was meant to avoid.
 */
function numbersAround(
  answer: number,
  offsets: readonly number[],
  count: number,
): number[] {
  const picks = [answer]
  for (const offset of shuffle([...offsets])) {
    if (picks.length >= count) break
    const candidate = answer + offset
    if (candidate >= 1 && !picks.includes(candidate)) picks.push(candidate)
  }
  return picks.sort((a, b) => a - b)
}

/** Immediate neighbours only: a decoy far from the answer is one nobody would
    pick, so it spends a slot without asking anything. */
const NEAR_OFFSETS = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6]

export function chapterChoices(chapter: string, count = 6): string[] {
  return numbersAround(Number(chapter), NEAR_OFFSETS, count).map(String)
}

/** Nearby verses of the *same shape*: a range answer gets range decoys of equal
    span, so "the long one is the answer" is never a strategy. */
export function verseChoices(verses: string, count = 6): string[] {
  const [start, end] = verses.split('-').map(Number)
  const span = (Number.isFinite(end) ? end : start) - start
  return numbersAround(start, NEAR_OFFSETS, count).map((first) =>
    span > 0 ? `${first}-${first + span}` : String(first),
  )
}

export type ReferenceStepKind = 'book' | 'chapter' | 'verse'

export interface ReferenceStep {
  kind: ReferenceStepKind
  /** Exactly one of `choices` — taps compare with `===`, since both sides come
      out of this function. */
  answer: string
  choices: string[]
}

/** The three steps of the drill, or null when this reference can't be drilled
    with tiles: it doesn't parse, or its book has no canon neighbours to draw
    decoys from. Callers read null as "skip the phase". */
export function buildReferenceSteps(reference: string): ReferenceStep[] | null {
  const parsed = parseReference(reference)
  if (!parsed || !BOOKS.includes(parsed.book)) return null

  return [
    { kind: 'book', answer: parsed.book, choices: bookChoices(parsed.book) },
    {
      kind: 'chapter',
      answer: parsed.chapter,
      choices: chapterChoices(parsed.chapter),
    },
    {
      kind: 'verse',
      answer: parsed.verses,
      choices: verseChoices(parsed.verses),
    },
  ]
}

/** Spellings that are the same book. */
const BOOK_ALIASES: Record<string, string> = {
  psalms: 'psalm',
  'song of songs': 'song of solomon',
  canticles: 'song of solomon',
}

function normalizeBook(book: string): string {
  const spelled = tidy(book)
    .toLowerCase()
    .replace(/^(iii|3rd)\b/, '3')
    .replace(/^(ii|2nd)\b/, '2')
    .replace(/^(i|1st)\b/, '1')
    .replace(/\s+/g, ' ')
    .trim()
  return BOOK_ALIASES[spelled] ?? spelled
}

/**
 * True when `typed` names `canonical`. A three-letter-or-longer prefix counts
 * ("Phil" for "Philippians") — there is only ever one expected book to compare
 * against, so the ambiguity costs nothing, and the floor blocks "j 3:16". The
 * numeral stays part of the string, so "John" still fails against "1 John".
 */
function booksMatch(typed: string, canonical: string): boolean {
  const t = normalizeBook(typed)
  const c = normalizeBook(canonical)
  return t === c || (t.length >= 3 && c.startsWith(t))
}

/** As `normalizeTypedText`, minus the one difference that matters: ':' and '-'
    survive, because in a reference they're structure rather than punctuation. */
function normalizeReferenceText(text: string): string {
  return tidy(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s:-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Forgiving reference comparison for typed exercises. Case, spacing, periods
 * and dash flavour don't count, nor does an abbreviated or roman-numeralled
 * book. The chapter and verse must be exact — those are what is being tested.
 */
export function referencesMatch(input: string, reference: string): boolean {
  const typed = parseReference(input)
  const answer = parseReference(reference)
  if (!typed || !answer) {
    return normalizeReferenceText(input) === normalizeReferenceText(reference)
  }

  return (
    booksMatch(typed.book, answer.book) &&
    typed.chapter === answer.chapter &&
    typed.verses === answer.verses
  )
}
