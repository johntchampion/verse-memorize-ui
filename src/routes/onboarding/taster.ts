export interface TasterPart {
  word: string
  blank?: boolean
  /** Punctuation trailing the word, rendered outside an unfilled blank. */
  after?: string
}

export const TASTER_REFERENCE = 'Psalm 23:1'

const PARTS: TasterPart[] = [
  { word: 'The' },
  { word: 'Lord' },
  { word: 'is' },
  { word: 'my' },
  { word: 'shepherd', blank: true, after: ',' },
  { word: 'I' },
  { word: 'lack' },
  { word: 'nothing', blank: true, after: '.' },
]

export const TASTER_BANK = ['nothing', 'shepherd', 'peace', 'Lord']

export const TASTER_ANSWERS = PARTS.filter((p) => p.blank).map((p) => p.word)

/** Each part paired with its position among the blanks (null for plain text). */
export const INDEXED_PARTS = PARTS.reduce<
  { part: TasterPart; blankIndex: number | null }[]
>((acc, part) => {
  const blanksSoFar = acc.filter((p) => p.blankIndex !== null).length
  acc.push({ part, blankIndex: part.blank ? blanksSoFar : null })
  return acc
}, [])
