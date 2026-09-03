import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { SessionExercise } from '../../api/types'
import TranslationTag from '../TranslationTag'
import {
  REFERENCE_SLIP_PER_STEP,
  missTolerance,
  shuffle,
  splitIntoChunks,
  usesReferencePhase,
  wordsMatch,
} from '../../lib/exercise'
import {
  BANK_ROWS,
  countTilesInRows,
  heightOfRows,
  replaceTappedTile,
  showOneMoreTile,
  trimToCapacity,
  withAnswerSpelling,
  type BankWindow,
} from '../../lib/wordBank'
import {
  buildReferenceSteps,
  type ReferenceStep,
  type ReferenceStepKind,
} from '../../lib/reference'
import { ScoreChip, StageChip } from './ExerciseChips'
import NextButton from './NextButton'
import ReferenceBank from './ReferenceBank'
import ReferenceLine from './ReferenceLine'
import VerseBody from './VerseBody'
import WordTile from './WordTile'

interface Props {
  exercise: SessionExercise
  fullText: string
  translation: string
  isLast: boolean
  pending: boolean
  onComplete: (correct: boolean) => void
}

const WRONG_FLASH_MS = 400
/** Clearance the current target needs above the dock before the page scrolls. */
const SCROLL_MARGIN_PX = 12

const REFERENCE_PROMPTS: Record<ReferenceStepKind, string> = {
  book: 'Tap the book',
  chapter: 'Tap the chapter',
  verse: 'Tap the verse',
}

function isOutOfView(target: HTMLElement, dock: HTMLElement | null): boolean {
  const dockTop = dock?.getBoundingClientRect().top ?? window.innerHeight
  const rect = target.getBoundingClientRect()
  return rect.bottom > dockTop - SCROLL_MARGIN_PX || rect.top < SCROLL_MARGIN_PX
}

/**
 * `scrollIntoView`'s behavior is a JS argument, so the blanket reduced-motion
 * rule in index.css can't reach it — the preference has to be read here.
 */
function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth'
}

/**
 * Tile exercise: validates on tap. A correct tile fills the next empty blank; a
 * wrong tile shakes, breaks the combo and changes nothing. The attempt is
 * graded on wrong taps, forgiving one per `missTolerance` blanks.
 *
 * The bank is a rolling window (see `lib/wordBank.ts`) measured against the
 * three rows the dock shows. Filling the last blank then starts the reference
 * phase: the reference turns into book/chapter/verse blanks and the dock asks
 * for each in turn. Those chips are a plain list — three steps of six never
 * need a window.
 */
export default function TileExercise({
  exercise,
  fullText,
  translation,
  isLast,
  pending,
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

  // State, not a memo: this shuffles, and recomputing would reorder the chips
  // under the user's thumb. null means no reference drill on this exercise.
  const [refSteps] = useState<ReferenceStep[] | null>(() =>
    usesReferencePhase(exercise.stage)
      ? buildReferenceSteps(exercise.reference)
      : null,
  )
  const [filledRefSteps, setFilledRefSteps] = useState(0)
  const [refMisses, setRefMisses] = useState(0)

  const flashTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const currentBlankRef = useRef<HTMLSpanElement | null>(null)
  const refLineRef = useRef<HTMLParagraphElement | null>(null)
  const dockRef = useRef<HTMLDivElement | null>(null)
  const bankRef = useRef<HTMLDivElement | null>(null)
  const isRotating = useRef(false)
  /** Blocks top-ups after a trim so trim and top-up can't ping-pong. */
  const windowIsFull = useRef(false)

  const textDone = filledBlanks >= blanks.length
  const slipBudget = missTolerance(blanks.length)
  const refSlipBudget = (refSteps?.length ?? 0) * REFERENCE_SLIP_PER_STEP

  /** The reference drill's steps once it's the user's turn at them. */
  const refPhase = textDone ? refSteps : null
  const refStep =
    refPhase && filledRefSteps < refPhase.length
      ? refPhase[filledRefSteps]
      : null
  // Outlives `refStep` by one: the last board stays on screen, frozen, rather
  // than the dock emptying out while the user reaches for Next.
  const refBoard = refPhase
    ? refPhase[Math.min(filledRefSteps, refPhase.length - 1)]
    : null
  const isComplete = textDone && refStep === null

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
      isRotating.current = true
      windowIsFull.current = true
      setBank(
        trimToCapacity(bank, capacity, labels, blanks[filledBlanks]?.answer),
      )
    } else if (bank.offScreen.length > 0 && !windowIsFull.current) {
      setBank(showOneMoreTile(bank))
    }
  }, [bank, bankHeight, blanks, filledBlanks, labels])

  // Keeps whatever has to be tapped next in view above the dock. During the
  // reference phase, scrolling the page to the very top (rather than just
  // bringing the reference line to the dock's edge) is what brings the whole
  // finished verse back into view above it, so the words are there to be placed.
  useEffect(() => {
    if (refStep) {
      const target = refLineRef.current
      if (!target || !isOutOfView(target, dockRef.current)) return
      window.scrollTo({ top: 0, behavior: scrollBehavior() })
      return
    }
    const target = currentBlankRef.current
    if (!target || !isOutOfView(target, dockRef.current)) return
    target.scrollIntoView({ block: 'center', behavior: scrollBehavior() })
  }, [filledBlanks, filledRefSteps, refStep])

  /** Callers add the miss to whichever counter their phase is graded on. */
  function rejectTap(tileId: number) {
    setCombo(0)
    setWrongTileId(tileId)
    flashTimers.current.push(
      setTimeout(() => setWrongTileId(null), WRONG_FLASH_MS),
    )
  }

  function acceptTap() {
    setCombo((count) => count + 1)
    setWrongTileId(null)
  }

  /** Rotates the tapped tile out, or hollows it in place if the bank fits. */
  function spendTile(tileId: number, position: number, answer: string) {
    const availableIds = [...bank.offScreen, ...bank.onScreen].filter(
      (id) => !spentTiles.has(id),
    )
    const nextLabels = withAnswerSpelling(labels, tileId, answer, availableIds)
    if (nextLabels !== labels) setLabels(nextLabels)

    windowIsFull.current = false
    if (isRotating.current) {
      const upcoming = blanks[filledBlanks + 1]?.answer
      setBank((current) =>
        replaceTappedTile(current, position, upcoming, nextLabels),
      )
    } else {
      setSpentTiles((current) => new Set(current).add(tileId))
    }
  }

  function tapTile(tileId: number, position: number) {
    if (textDone || spentTiles.has(tileId)) return

    const answer = blanks[filledBlanks].answer
    if (!wordsMatch(labels[tileId], answer)) {
      setMisses((count) => count + 1)
      rejectTap(tileId)
      return
    }

    spendTile(tileId, position, answer)
    acceptTap()
    setFilledBlanks(filledBlanks + 1)
  }

  // `wrongTileId` holds a chip position here rather than a tile id; the two
  // banks never render together, so they can share it.
  function tapRefChip(choice: string, position: number) {
    if (!refStep) return

    if (choice !== refStep.answer) {
      setRefMisses((count) => count + 1)
      rejectTap(position)
      return
    }

    // The combo runs on through the phase change — it's one unbroken streak.
    acceptTap()
    setFilledRefSteps(filledRefSteps + 1)
  }

  return (
    <div className='exercise-pane'>
      <div className='chip-row'>
        <StageChip exercise={exercise} />
        <ScoreChip
          filled={refPhase ? filledRefSteps : filledBlanks}
          total={refPhase ? refPhase.length : blanks.length}
          noun={refPhase ? 'steps' : 'blanks'}
          combo={combo}
          misses={refPhase ? refMisses : misses}
          slipBudget={refPhase ? refSlipBudget : slipBudget}
        />
      </div>

      <div className='verse-card'>
        <div className='verse-card-head'>
          {refPhase ? (
            <ReferenceLine
              steps={refPhase}
              filled={filledRefSteps}
              lineRef={refLineRef}
            />
          ) : (
            <p className='verse-ref'>{exercise.reference}</p>
          )}
          <TranslationTag code={translation} />
        </div>
        <VerseBody
          chunks={chunks}
          filledBlanks={filledBlanks}
          currentBlankRef={currentBlankRef}
        />
      </div>

      <div className='bank-dock' ref={dockRef}>
        {/* A live region: this only changes when the drill asks for the next
            part of the reference. */}
        <p className='bank-label' role='status'>
          {refBoard ? REFERENCE_PROMPTS[refBoard.kind] : 'Tap the missing words'}
        </p>

        {refBoard ? (
          <ReferenceBank
            board={refBoard}
            isDone={refStep === null}
            wrongPosition={wrongTileId}
            minHeight={bankHeight}
            onTap={tapRefChip}
          />
        ) : (
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
                  disabled={isSpent || textDone}
                  onTap={() => tapTile(tileId, position)}
                />
              )
            })}
          </div>
        )}

        <NextButton
          isLast={isLast}
          pending={pending}
          disabled={!isComplete}
          style={{ marginTop: 20 }}
          onClick={() =>
            onComplete(misses <= slipBudget && refMisses <= refSlipBudget)
          }
        />
      </div>
    </div>
  )
}
