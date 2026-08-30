import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import type { SessionExercise } from '../api/types'
import TranslationTag from './TranslationTag'
import {
  STAGE_LABELS,
  missTolerance,
  parseExercise,
  wordsMatch,
  wordsMatchExactly,
  type BlankSegment,
} from '../lib/exercise'

interface Props {
  exercise: SessionExercise
  fullText: string
  translation: string
  isLast: boolean
  onComplete: (correct: boolean) => void
}

const WRONG_FLASH_MS = 400
const BANK_ROWS = 3
/** Clearance the current blank needs above the dock before the page scrolls. */
const BLANK_MARGIN_PX = 12

const chipRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 14,
}

/** A run of verse text, or one blank paired with its position in fill order. */
type VerseChunk =
  | { kind: 'text'; text: string }
  | { kind: 'blank'; blankIndex: number; blank: BlankSegment }

/** Tiles on screen, plus the ones that didn't fit and await a slot. */
interface BankWindow {
  onScreen: number[]
  offScreen: number[]
}

function splitIntoChunks(
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

function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function includesSpellingOf(
  tileIds: number[],
  labels: string[],
  answer: string,
): boolean {
  return tileIds.some((id) => wordsMatchExactly(labels[id], answer))
}

/**
 * Position within `tileIds` of the best tile for `answer`: one that spells
 * it exactly, or failing that a differently-capitalized variant, which taps
 * accept too. -1 when neither is there.
 */
function positionOfBestTile(
  tileIds: number[],
  labels: string[],
  answer: string,
): number {
  const exact = tileIds.findIndex((id) => wordsMatchExactly(labels[id], answer))
  if (exact !== -1) return exact
  return tileIds.findIndex((id) => wordsMatch(labels[id], answer))
}

/**
 * Taps accept any capitalization, so the tile tapped for `answer` may not be
 * the one that spells it. Trading their labels keeps what is left in the bank
 * matching the blanks that are left — otherwise "I AM WHO I AM" spends its
 * lowercase tile early and has none for "how I am to be remembered".
 */
function withAnswerSpelling(
  labels: string[],
  tappedId: number,
  answer: string,
  availableIds: number[],
): string[] {
  if (wordsMatchExactly(labels[tappedId], answer)) return labels
  const partner = availableIds.find(
    (id) => id !== tappedId && wordsMatchExactly(labels[id], answer),
  )
  if (partner === undefined) return labels

  const traded = [...labels]
  ;[traded[tappedId], traded[partner]] = [traded[partner], traded[tappedId]]
  return traded
}

/** Sends tiles past `capacity` off screen, keeping `neededAnswer` in view. */
function trimToCapacity(
  bank: BankWindow,
  capacity: number,
  labels: string[],
  neededAnswer: string | undefined,
): BankWindow {
  const onScreen = bank.onScreen.slice(0, capacity)
  const overflow = bank.onScreen.slice(capacity)

  if (
    neededAnswer !== undefined &&
    onScreen.length > 0 &&
    !includesSpellingOf(onScreen, labels, neededAnswer)
  ) {
    const rescue = positionOfBestTile(overflow, labels, neededAnswer)
    if (rescue !== -1) {
      const last = onScreen.length - 1
      ;[onScreen[last], overflow[rescue]] = [overflow[rescue], onScreen[last]]
    }
  }

  return { onScreen, offScreen: [...overflow, ...bank.offScreen] }
}

/** Swaps the tapped tile for an off-screen one that keeps play going. */
function replaceTappedTile(
  bank: BankWindow,
  tappedPosition: number,
  upcomingAnswer: string | undefined,
  labels: string[],
): BankWindow {
  const remaining = bank.onScreen.filter((_, at) => at !== tappedPosition)
  if (bank.offScreen.length === 0) return { onScreen: remaining, offScreen: [] }

  let drawAt = 0
  if (
    upcomingAnswer !== undefined &&
    !includesSpellingOf(remaining, labels, upcomingAnswer)
  ) {
    const rescue = positionOfBestTile(bank.offScreen, labels, upcomingAnswer)
    if (rescue !== -1) drawAt = rescue
  }

  const onScreen = [...bank.onScreen]
  onScreen[tappedPosition] = bank.offScreen[drawAt]
  const offScreen = bank.offScreen.filter((_, at) => at !== drawAt)
  return { onScreen, offScreen }
}

function showOneMoreTile(bank: BankWindow): BankWindow {
  return {
    onScreen: [...bank.onScreen, bank.offScreen[0]],
    offScreen: bank.offScreen.slice(1),
  }
}

function heightOfRows(container: HTMLElement, tile: HTMLElement): number {
  const rowGap = parseFloat(getComputedStyle(container).rowGap) || 0
  return BANK_ROWS * tile.offsetHeight + (BANK_ROWS - 1) * rowGap
}

function countTilesInRows(tiles: HTMLElement[], rows: number): number {
  const rowTops = [...new Set(tiles.map((tile) => tile.offsetTop))].sort(
    (a, b) => a - b,
  )
  return tiles.filter((tile) => rowTops.indexOf(tile.offsetTop) < rows).length
}

function isBlankOutOfView(
  blank: HTMLElement,
  dock: HTMLElement | null,
): boolean {
  const dockTop = dock?.getBoundingClientRect().top ?? window.innerHeight
  const rect = blank.getBoundingClientRect()
  return rect.bottom > dockTop - BLANK_MARGIN_PX || rect.top < BLANK_MARGIN_PX
}

function StageChip({ exercise }: { exercise: SessionExercise }) {
  const isReview = exercise.queue === 'review'
  return (
    <span className={isReview ? 'chip chip-review' : 'chip chip-active'}>
      {isReview ? 'Review' : STAGE_LABELS[exercise.stage]}
    </span>
  )
}

/**
 * Once a slip is spent the remaining budget matters more than the combo, and
 * showing it is the only way the forgiveness is legible.
 */
function ScoreChip({
  filledBlanks,
  totalBlanks,
  combo,
  misses,
  slipBudget,
}: {
  filledBlanks: number
  totalBlanks: number
  combo: number
  misses: number
  slipBudget: number
}) {
  const slipsLeft = Math.max(0, slipBudget - misses)
  const label =
    misses > 0 && slipBudget > 0
      ? `${slipsLeft} slip${slipsLeft === 1 ? '' : 's'} left`
      : combo >= 2
        ? `🔥 ${combo} in a row`
        : `${filledBlanks} of ${totalBlanks} blanks`

  return (
    <span
      className={
        misses > 0 && slipsLeft === 0 ? 'chip chip-relearn' : 'chip chip-streak'
      }
    >
      {label}
    </span>
  )
}

function VerseBody({
  chunks,
  filledBlanks,
  currentBlankRef,
}: {
  chunks: VerseChunk[]
  filledBlanks: number
  currentBlankRef: RefObject<HTMLSpanElement | null>
}) {
  return (
    <p className='verse-text'>
      {chunks.map((chunk, index) => {
        const space = index > 0 ? ' ' : ''

        if (chunk.kind === 'text') {
          return (
            <span key={index}>
              {space}
              {chunk.text}
            </span>
          )
        }

        if (chunk.blankIndex < filledBlanks) {
          return (
            <span key={index}>
              {space}
              <span className='blank-filled'>{chunk.blank.filledRaw}</span>
            </span>
          )
        }

        const isCurrent = chunk.blankIndex === filledBlanks
        return (
          <span key={index}>
            {space}
            {chunk.blank.punctBefore}
            <span
              ref={isCurrent ? currentBlankRef : undefined}
              className={isCurrent ? 'blank blank-current' : 'blank'}
              aria-label='blank'
            >
              {chunk.blank.hidden}
            </span>
            {chunk.blank.punctAfter}
          </span>
        )
      })}
    </p>
  )
}

function WordTile({
  label,
  isSpent,
  isWrong,
  disabled,
  onTap,
}: {
  label: string
  isSpent: boolean
  isWrong: boolean
  disabled: boolean
  onTap: () => void
}) {
  const state = isSpent ? ' tile-used' : isWrong ? ' tile-wrong' : ''
  return (
    <button
      type='button'
      className={`tile tile-in${state}`}
      disabled={disabled}
      onClick={onTap}
    >
      {label}
    </button>
  )
}

/**
 * Tile exercise: validates on tap. A correct tile fills the next empty blank; a
 * wrong tile shakes, breaks the combo and changes nothing. The attempt is
 * graded on wrong taps, forgiving one per `missTolerance` blanks.
 *
 * The bank is a BANK_ROWS-tall window docked to the bottom of the screen. How
 * many tiles fit is measured rather than counted: a layout effect sends tiles
 * that wrapped past the last row off screen and brings them back as taps free
 * space, always keeping a tile that spells the current answer in view. Banks
 * that fit whole never trim, so their tiles hollow out in place instead.
 */
export default function TileExercise({
  exercise,
  fullText,
  translation,
  isLast,
  onComplete,
}: Props) {
  const { chunks, blanks } = useMemo(
    () => splitIntoChunks(exercise.blankedText, fullText),
    [exercise.blankedText, fullText],
  )

  const [labels, setLabels] = useState<string[]>(() => [...exercise.wordBank])
  const [bank, setBank] = useState<BankWindow>(() => ({
    onScreen: shuffle(labels.map((_, id) => id)),
    offScreen: [],
  }))
  const [bankHeight, setBankHeight] = useState<number | null>(null)
  const [filledBlanks, setFilledBlanks] = useState(0)
  const [spentTiles, setSpentTiles] = useState<ReadonlySet<number>>(new Set())
  const [wrongTileId, setWrongTileId] = useState<number | null>(null)
  const [combo, setCombo] = useState(0)
  const [misses, setMisses] = useState(0)

  const flashTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const currentBlankRef = useRef<HTMLSpanElement | null>(null)
  const dockRef = useRef<HTMLDivElement | null>(null)
  const bankRef = useRef<HTMLDivElement | null>(null)
  const isRolling = useRef(false)
  /** Blocks top-ups after a trim so trim and top-up can't ping-pong. */
  const windowIsFull = useRef(false)

  const allBlanksFilled = filledBlanks >= blanks.length
  const slipBudget = missTolerance(blanks.length)

  useEffect(() => {
    const pending = flashTimers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  // Measure first, then fit: the height can only be read once tiles have been
  // laid out, and the fit can only be judged against a locked-down height.
  useLayoutEffect(() => {
    const container = bankRef.current
    if (!container) return
    const tiles = Array.from(container.children) as HTMLElement[]
    if (tiles.length === 0) return

    if (bankHeight === null) {
      setBankHeight(heightOfRows(container, tiles[0]))
      return
    }

    const capacity = countTilesInRows(tiles, BANK_ROWS)
    if (capacity < bank.onScreen.length) {
      isRolling.current = true
      windowIsFull.current = true
      setBank(
        trimToCapacity(bank, capacity, labels, blanks[filledBlanks]?.answer),
      )
    } else if (bank.offScreen.length > 0 && !windowIsFull.current) {
      setBank(showOneMoreTile(bank))
    }
  }, [bank, bankHeight, blanks, filledBlanks, labels])

  useEffect(() => {
    const blank = currentBlankRef.current
    if (blank && isBlankOutOfView(blank, dockRef.current)) {
      blank.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [filledBlanks])

  function fillCurrentBlank(tappedPosition: number, tileId: number) {
    const answer = blanks[filledBlanks].answer
    const availableIds = [...bank.offScreen, ...bank.onScreen].filter(
      (id) => !spentTiles.has(id),
    )
    const nextLabels = withAnswerSpelling(labels, tileId, answer, availableIds)
    if (nextLabels !== labels) setLabels(nextLabels)

    windowIsFull.current = false
    if (isRolling.current) {
      const upcoming = blanks[filledBlanks + 1]?.answer
      setBank((current) =>
        replaceTappedTile(current, tappedPosition, upcoming, nextLabels),
      )
    } else {
      setSpentTiles((current) => new Set(current).add(tileId))
    }

    setCombo((count) => count + 1)
    setWrongTileId(null)
    setFilledBlanks(filledBlanks + 1)
  }

  function rejectTap(tileId: number) {
    setMisses((count) => count + 1)
    setCombo(0)
    setWrongTileId(tileId)
    flashTimers.current.push(
      setTimeout(() => setWrongTileId(null), WRONG_FLASH_MS),
    )
  }

  function tapTile(tappedPosition: number, tileId: number) {
    if (allBlanksFilled || spentTiles.has(tileId)) return

    if (wordsMatch(labels[tileId], blanks[filledBlanks].answer)) {
      fillCurrentBlank(tappedPosition, tileId)
    } else {
      rejectTap(tileId)
    }
  }

  return (
    <div className='exercise-pane'>
      <div style={chipRowStyle}>
        <StageChip exercise={exercise} />
        <ScoreChip
          filledBlanks={filledBlanks}
          totalBlanks={blanks.length}
          combo={combo}
          misses={misses}
          slipBudget={slipBudget}
        />
      </div>

      <div className='verse-card'>
        <div className='verse-card-head'>
          <p className='verse-ref'>{exercise.reference}</p>
          <TranslationTag code={translation} />
        </div>
        <VerseBody
          chunks={chunks}
          filledBlanks={filledBlanks}
          currentBlankRef={currentBlankRef}
        />
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
          {bank.onScreen.map((tileId, position) => {
            const isSpent = spentTiles.has(tileId)
            return (
              <WordTile
                key={tileId}
                label={labels[tileId]}
                isSpent={isSpent}
                isWrong={wrongTileId === tileId}
                disabled={isSpent || allBlanksFilled}
                onTap={() => tapTile(position, tileId)}
              />
            )
          })}
        </div>

        <button
          type='button'
          className='btn'
          style={{ marginTop: 20 }}
          disabled={!allBlanksFilled}
          onClick={() => onComplete(misses <= slipBudget)}
        >
          {isLast ? 'Finish session →' : 'Next verse →'}
        </button>
      </div>
    </div>
  )
}
