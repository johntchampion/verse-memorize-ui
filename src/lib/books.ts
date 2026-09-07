import { shuffle } from './exercise'

/**
 * The 66 books in canon order — the only source of "nearby" for book decoys.
 * Spelled the way the curriculum spells them, hence "Psalm" not "Psalms";
 * `booksMatch` forgives the plural on the typed path.
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
 * because "1 John" for "John" is the confusion worth testing, and a neighbour
 * walk alone would rarely surface them. Shuffled, since book names have no
 * natural order for the eye to fall back on.
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

  // Outward from the answer, alternating sides so it isn't pinned to one end.
  for (let step = 1; step < BOOKS.length && picks.length < count - 1; step++) {
    if (BOOKS[at - step]) add(BOOKS[at - step])
    if (BOOKS[at + step]) add(BOOKS[at + step])
  }

  return shuffle([book, ...picks.slice(0, count - 1)])
}
