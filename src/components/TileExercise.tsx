import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { SessionExercise } from '../api/types'
import TranslationTag from './TranslationTag'
import {
  STAGE_LABELS,
  missTolerance,
  parseExercise,
  wordsMatch,
  type BlankSegment,
} from '../lib/exercise'

interface Props {
  exercise: SessionExercise
  fullText: string
  translation: string
  /** Fired once every blank is filled; correct = no wrong taps along the way. */
  onComplete: (correct: boolean) => void
}

const WRONG_FLASH_MS = 400

/** The bank always shows exactly this many rows of tiles. */
const BANK_ROWS = 3

interface BankState {
  /** Bank indices currently shown, in display order. */
  visible: number[]
  /** Bank indices that didn't fit, drawn from the front as slots open up. */
  pool: number[]
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Replaces the tile at `tappedPos` with one drawn from the pool, preferring
 * whatever keeps the upcoming answer on screen. With the pool exhausted the
 * slot simply closes up.
 */
function refill(
  bank: BankState,
  tappedPos: number,
  nextAnswer: string | undefined,
  words: string[],
): BankState {
  const rest = bank.visible.filter((_, pos) => pos !== tappedPos)
  if (bank.pool.length === 0) return { visible: rest, pool: [] }

  let drawAt = 0
  if (
    nextAnswer !== undefined &&
    !rest.some((i) => wordsMatch(words[i], nextAnswer))
  ) {
    const found = bank.pool.findIndex((i) => wordsMatch(words[i], nextAnswer))
    if (found !== -1) drawAt = found
  }
  const visible = [...bank.visible]
  visible[tappedPos] = bank.pool[drawAt]
  return { visible, pool: bank.pool.filter((_, i) => i !== drawAt) }
}

/**
 * Tile exercise: validates on tap. A correct tile fills the next empty blank
 * (a green pill popping into place); a wrong tile shakes, breaks the combo and
 * changes nothing.
 *
 * The word bank is a fixed BANK_ROWS-row window docked to the bottom of the
 * screen. How many tiles fit is measured, not counted: a layout effect trims
 * tiles that wrap past the last row back into a hidden pool and tops the rows
 * back up when a tap frees space, always keeping the current blank's answer on
 * screen (blanks fill strictly in order, so that's the only invariant needed).
 * Banks that fit entirely keep the classic behavior — used tiles hollow out in
 * place. Long verses auto-scroll to keep the current blank in view above the
 * dock. Once every blank is filled, the Next button at the bottom of the dock
 * activates.
 *
 * Correctness per-tap is already known, so the attempt is graded on the number
 * of wrong taps — forgiving a slip per `missTolerance` blanks. A review blanks
 * every word, so without that a single mistap on a 75-word verse would count
 * the same as one on a 4-blank learning exercise, and two of those demote the
 * verse out of review entirely.
 */
export default function TileExercise({
  exercise,
  fullText,
  translation,
  onComplete,
}: Props) {
  // Each segment paired with its position among the blanks (null for text),
  // computed once so render itself mutates nothing.
  const { segments, blanks } = useMemo(() => {
    const parsed = parseExercise(exercise.blankedText, fullText)
    let counter = 0
    const indexed = parsed.map((segment) => ({
      segment,
      blankIndex: segment.kind === 'blank' ? counter++ : null,
    }))
    return {
      segments: indexed,
      blanks: parsed.filter((s): s is BlankSegment => s.kind === 'blank'),
    }
  }, [exercise.blankedText, fullText])

  const [bank, setBank] = useState<BankState>(() => ({
    visible: shuffle(exercise.wordBank.map((_, i) => i)),
    pool: [],
  }))
  const [bankHeight, setBankHeight] = useState<number | null>(null)
  const [filledCount, setFilledCount] = useState(0)
  const [usedTiles, setUsedTiles] = useState<ReadonlySet<number>>(new Set())
  const [wrongTile, setWrongTile] = useState<number | null>(null)
  const [combo, setCombo] = useState(0)
  const [misses, setMisses] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const currentBlankRef = useRef<HTMLSpanElement | null>(null)
  const dockRef = useRef<HTMLDivElement | null>(null)
  const bankRef = useRef<HTMLDivElement | null>(null)
  // True once any tile has been trimmed for space: the bank is a rolling
  // window and used tiles are replaced rather than hollowed out.
  const rolling = useRef(false)
  // Blocks top-ups after a trim so trim/append don't ping-pong; a tap frees
  // space and lifts the block.
  const windowFull = useRef(false)

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  // Size and fill the bank window before paint: lock the container to
  // BANK_ROWS rows tall, move tiles that wrapped past the last row into the
  // pool (swapping the needed answer back in if it was among them), and when
  // there's room, pull tiles back out of the pool one per pass.
  useLayoutEffect(() => {
    const container = bankRef.current
    if (!container) return
    const tiles = Array.from(container.children) as HTMLElement[]
    if (tiles.length === 0) return

    if (bankHeight === null) {
      const gap = parseFloat(getComputedStyle(container).rowGap) || 0
      setBankHeight(BANK_ROWS * tiles[0].offsetHeight + (BANK_ROWS - 1) * gap)
      return
    }

    const rowTops = [...new Set(tiles.map((t) => t.offsetTop))].sort(
      (a, b) => a - b,
    )
    const fitCount = tiles.filter(
      (t) => rowTops.indexOf(t.offsetTop) < BANK_ROWS,
    ).length

    if (fitCount < bank.visible.length) {
      rolling.current = true
      windowFull.current = true
      const kept = bank.visible.slice(0, fitCount)
      const cut = bank.visible.slice(fitCount)
      const needed = blanks[filledCount]?.answer
      if (
        needed !== undefined &&
        !kept.some((i) => wordsMatch(exercise.wordBank[i], needed))
      ) {
        const at = cut.findIndex((i) =>
          wordsMatch(exercise.wordBank[i], needed),
        )
        if (at !== -1 && kept.length > 0) {
          ;[kept[kept.length - 1], cut[at]] = [cut[at], kept[kept.length - 1]]
        }
      }
      setBank({ visible: kept, pool: [...cut, ...bank.pool] })
    } else if (bank.pool.length > 0 && !windowFull.current) {
      setBank({
        visible: [...bank.visible, bank.pool[0]],
        pool: bank.pool.slice(1),
      })
    }
  }, [bank, bankHeight, blanks, filledCount, exercise.wordBank])

  // Keep the current blank visible above the dock as fills march down a long
  // verse; leave the page alone whenever the blank is already in view.
  useEffect(() => {
    const blank = currentBlankRef.current
    if (!blank) return
    const dockTop =
      dockRef.current?.getBoundingClientRect().top ?? window.innerHeight
    const rect = blank.getBoundingClientRect()
    if (rect.bottom > dockTop - 12 || rect.top < 12) {
      blank.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [filledCount])

  const complete = filledCount >= blanks.length
  const slips = missTolerance(blanks.length)
  const slipsLeft = Math.max(0, slips - misses)

  function tapTile(pos: number, bankIdx: number, word: string) {
    if (complete || usedTiles.has(bankIdx)) return
    const target = blanks[filledCount]

    if (wordsMatch(word, target.answer)) {
      windowFull.current = false
      if (rolling.current) {
        setBank((prev) =>
          refill(prev, pos, blanks[filledCount + 1]?.answer, exercise.wordBank),
        )
      } else {
        setUsedTiles((prev) => new Set(prev).add(bankIdx))
      }
      setCombo((c) => c + 1)
      setWrongTile(null)
      setFilledCount(filledCount + 1)
    } else {
      setMisses((m) => m + 1)
      setCombo(0)
      setWrongTile(bankIdx)
      timers.current.push(setTimeout(() => setWrongTile(null), WRONG_FLASH_MS))
    }
  }

  return (
    <div className='exercise-pane'>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <span
          className={
            exercise.queue === 'review'
              ? 'chip chip-review'
              : 'chip chip-active'
          }
        >
          {exercise.queue === 'review'
            ? 'Review'
            : STAGE_LABELS[exercise.stage]}
        </span>
        <span
          className={
            misses > 0 && slipsLeft === 0
              ? 'chip chip-relearn'
              : 'chip chip-streak'
          }
        >
          {/* Once a slip is spent, the budget matters more than the combo —
              showing it is the only way the forgiveness is legible. */}
          {misses > 0 && slips > 0
            ? slipsLeft === 1
              ? '1 slip left'
              : `${slipsLeft} slips left`
            : combo >= 2
              ? `🔥 ${combo} in a row`
              : `${filledCount} of ${blanks.length} blanks`}
        </span>
      </div>

      <div className='verse-card'>
        <div className='verse-card-head'>
          <p className='verse-ref'>{exercise.reference}</p>
          <TranslationTag code={translation} />
        </div>
        <p className='verse-text'>
          {segments.map(({ segment, blankIndex }, i) => {
            const space = i > 0 ? ' ' : ''
            if (segment.kind === 'text' || blankIndex === null) {
              return (
                <span key={i}>
                  {space}
                  {segment.kind === 'text' ? segment.raw : segment.filledRaw}
                </span>
              )
            }
            const filled = blankIndex < filledCount
            const current = blankIndex === filledCount
            if (filled) {
              return (
                <span key={i}>
                  {space}
                  <span className='blank-filled'>{segment.filledRaw}</span>
                </span>
              )
            }
            return (
              <span key={i}>
                {space}
                {segment.punctBefore}
                <span
                  ref={current ? currentBlankRef : undefined}
                  className={current ? 'blank blank-current' : 'blank'}
                  aria-label='blank'
                >
                  {segment.hidden}
                </span>
                {segment.punctAfter}
              </span>
            )
          })}
        </p>
      </div>

      <div className='bank-dock' ref={dockRef}>
        <p className='bank-label'>Tap the missing words</p>
        <div
          className='word-bank'
          role='group'
          aria-label='Word bank'
          ref={bankRef}
          style={bankHeight !== null ? { height: bankHeight } : undefined}
        >
          {bank.visible.map((bankIdx, pos) => {
            const word = exercise.wordBank[bankIdx]
            const used = usedTiles.has(bankIdx)
            const className = [
              'tile',
              'tile-in',
              used ? 'tile-used' : wrongTile === bankIdx ? 'tile-wrong' : '',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <button
                key={bankIdx}
                type='button'
                className={className}
                disabled={used || complete}
                onClick={() => tapTile(pos, bankIdx, word)}
              >
                {word}
              </button>
            )
          })}
        </div>

        <button
          type='button'
          className='btn'
          style={{ marginTop: 20 }}
          disabled={!complete}
          onClick={() => onComplete(misses <= slips)}
        >
          Next verse →
        </button>
      </div>
    </div>
  )
}
