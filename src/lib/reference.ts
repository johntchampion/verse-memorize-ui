import { shuffle } from './exercise'

/**
 * Client-side reference parsing and the reference drill's choices.
 *
 * The API sends `reference` as one display string ("1 Corinthians 15:3-4") and
 * never decomposes it, so the book/chapter/verse split, the decoys and the
 * typed comparison are all derived here — the same arrangement `lib/exercise.ts`
 * has for the verse text. Nothing here is authoritative: a reference that won't
 * parse simply turns the reference phase off, leaving the exercise exactly as it
 * was before any of this existed.
 */

export interface ParsedReference {
  /** As written, whitespace collapsed: "1 Corinthians". */
  book: string
  /** Digits only, leading zeros dropped: "15". */
  chapter: string
  /** "3" or "3-4" — always a hyphen, never an en dash. */
  verses: string
}

/**
 * Book, chapter and verse(s). The book group is lazy with an anchored tail so
 * multi-word names land whole: "1 Corinthians 15:3-4" and "Song of Solomon 1:1"
 * both split at the last space before the chapter. `\p{L}` with the `u` flag
 * matches the tokenizer `lib/exercise.ts` uses.
 */
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
 * The 66 books in canon order — the only source of "nearby" for book decoys.
 *
 * Spelled the way the curriculum spells them, which is why this says "Psalm"
 * and not "Psalms"; `booksMatch` forgives the plural on the typed path. All 66
 * rather than the ~31 the curriculum uses: canon-adjacent decoys are the
 * instructive ones, and a shorter pool would leak which books the bank draws
 * from.
 */
export const BOOKS: readonly string[] = [
  'Genesis',
  'Exodus',
  'Leviticus',
  'Numbers',
  'Deuteronomy',
  'Joshua',
  'Judges',
  'Ruth',
  '1 Samuel',
  '2 Samuel',
  '1 Kings',
  '2 Kings',
  '1 Chronicles',
  '2 Chronicles',
  'Ezra',
  'Nehemiah',
  'Esther',
  'Job',
  'Psalm',
  'Proverbs',
  'Ecclesiastes',
  'Song of Solomon',
  'Isaiah',
  'Jeremiah',
  'Lamentations',
  'Ezekiel',
  'Daniel',
  'Hosea',
  'Joel',
  'Amos',
  'Obadiah',
  'Jonah',
  'Micah',
  'Nahum',
  'Habakkuk',
  'Zephaniah',
  'Haggai',
  'Zechariah',
  'Malachi',
  'Matthew',
  'Mark',
  'Luke',
  'John',
  'Acts',
  'Romans',
  '1 Corinthians',
  '2 Corinthians',
  'Galatians',
  'Ephesians',
  'Philippians',
  'Colossians',
  '1 Thessalonians',
  '2 Thessalonians',
  '1 Timothy',
  '2 Timothy',
  'Titus',
  'Philemon',
  'Hebrews',
  'James',
  '1 Peter',
  '2 Peter',
  '1 John',
  '2 John',
  '3 John',
  'Jude',
  'Revelation',
]

/** "1 John" and "John" share a base name; the numeral is the whole difference. */
function baseName(book: string): string {
  return book.replace(/^[1-3]\s+/, '')
}

/**
 * Decoy books: numbered siblings first, then canon neighbours. Siblings lead
 * because "1 John" for "John" is the confusion actually worth testing, and a
 * neighbour walk alone would rarely surface them.
 *
 * Shuffled, unlike the number choices — book names have no natural order for
 * the eye to fall back on, so a fixed position would be the tell.
 */
export function bookChoices(book: string, count = 5): string[] {
  const at = BOOKS.indexOf(book)
  if (at === -1) return [book]

  const picks: string[] = []
  const add = (candidate: string) => {
    if (candidate !== book && !picks.includes(candidate)) picks.push(candidate)
  }

  const base = baseName(book)
  for (const other of BOOKS) {
    if (baseName(other) === base) add(other)
  }

  // Outward from the answer, alternating sides so it isn't pinned to one end
  // of the neighbourhood it came from.
  for (let step = 1; step < BOOKS.length && picks.length < count - 1; step++) {
    if (BOOKS[at - step]) add(BOOKS[at - step])
    if (BOOKS[at + step]) add(BOOKS[at + step])
  }

  return shuffle([book, ...picks.slice(0, count - 1)])
}

/**
 * Distinct positive numbers around `answer` — `answer` included — ascending.
 *
 * Sorted rather than shuffled: numbers do have a natural order, so scattering
 * them only forces scanning, and the sorted position of the answer says
 * nothing about which one it is.
 */
function numbersAround(
  answer: number,
  offsets: readonly number[],
  count: number,
): number[] {
  const picks = [answer]
  for (const offset of offsets) {
    if (picks.length >= count) break
    const candidate = answer + offset
    if (candidate >= 1 && !picks.includes(candidate)) picks.push(candidate)
  }
  return picks.sort((a, b) => a - b)
}

/**
 * Immediate neighbours, alternating sides. Nothing wider: a decoy far from the
 * answer is one nobody would pick, so it spends a slot without asking
 * anything. The tight run is the test.
 */
const NEAR_OFFSETS = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6]

export function chapterChoices(chapter: string, count = 6): string[] {
  return numbersAround(Number(chapter), NEAR_OFFSETS, count).map(String)
}

/**
 * Nearby verses of the *same shape*: a range answer gets range decoys of equal
 * span, so "the long one is the answer" is never a strategy.
 */
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
   *  out of this function. */
  answer: string
  choices: string[]
}

/**
 * The three steps of the reference drill, or null when this reference can't be
 * drilled with tiles: it doesn't parse, or its book isn't in the canon list and
 * so has no neighbours to draw decoys from. Callers read null as "skip the
 * phase", which is exactly the behaviour that came before it.
 *
 * The chapter decoys don't know how many chapters a book actually has, so a
 * one-chapter book would be offered chapters that don't exist. Modelling that
 * is a per-book data table this feature doesn't earn, and the curriculum has
 * no such reference.
 */
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

/**
 * As `normalizeTypedText`, minus the one difference that matters: ':' and '-'
 * survive, because in a reference they're structure rather than punctuation.
 */
function normalizeReferenceText(text: string): string {
  return tidy(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s:-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Spellings that are the same book. A per-book abbreviation table ("Rom.",
 * "1 Cor.") would live here if the prefix rule in `booksMatch` proves too
 * blunt.
 */
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
 * ("Phil" for "Philippians") — safe because there is only ever one expected
 * book to compare against, so the ambiguity between Philippians and Philemon
 * costs nothing; the length floor is what blocks "j 3:16". The numeral stays
 * part of the string, so "John" still fails against "1 John", which is the
 * discrimination the drill is for.
 */
function booksMatch(typed: string, canonical: string): boolean {
  const t = normalizeBook(typed)
  const c = normalizeBook(canonical)
  return t === c || (t.length >= 3 && c.startsWith(t))
}

/**
 * Forgiving reference comparison for typed exercises. Case, spacing, periods
 * and dash flavour don't count, nor does an abbreviated or roman-numeralled
 * book. The chapter and verse must be exact — those are the thing being tested.
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
