import { useMemo, useRef, useState } from 'react'
import type { SessionExercise } from '../../api/types'
import TranslationTag from '../TranslationTag'
import { missTolerance, splitIntoChunks, wordsMatch } from '../../lib/exercise'
import type { ReferenceStepKind } from '../../lib/reference'
import { useBankWindow } from '../../hooks/useBankWindow'
import { useFlashTimers } from '../../hooks/useFlashTimers'
import { useReferenceDrill } from '../../hooks/useReferenceDrill'
import { useScrollToTarget } from '../../hooks/useScrollToTarget'
import { ScoreChip, StageChip } from './ExerciseChips'
import NextButton from './NextButton'
import ReferenceBank from './ReferenceBank'
import ReferenceLine from './ReferenceLine'
import VerseBody from './VerseBody'
import WordBank from './WordBank'

interface Props {
  exercise: SessionExercise
  fullText: string
  translation: string
  isLast: boolean
  pending: boolean
  onComplete: (correct: boolean) => void
}

const REFERENCE_PROMPTS: Record<ReferenceStepKind, string> = {
  book: 'Tap the book',
  chapter: 'Tap the chapter',
  verse: 'Tap the verse',
}

/**
 * Tile exercise: validates on tap. A correct tile fills the next empty blank; a
 * wrong tile shakes, breaks the combo and changes nothing. The attempt is
 * graded on wrong taps, forgiving one per `missTolerance` blanks.
 *
 * Filling the last blank starts the reference drill, which is graded against a
 * budget of its own.
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

  const [filledBlanks, setFilledBlanks] = useState(0)
  const [wrongTileId, setWrongTileId] = useState<number | null>(null)
  const [combo, setCombo] = useState(0)
  const [misses, setMisses] = useState(0)

  const currentBlankRef = useRef<HTMLSpanElement | null>(null)
  const dockRef = useRef<HTMLDivElement | null>(null)
  const flash = useFlashTimers()

  const textDone = filledBlanks >= blanks.length
  const slipBudget = missTolerance(blanks.length)

  const bank = useBankWindow(exercise.wordBank, blanks, filledBlanks)
  const drill = useReferenceDrill(exercise.stage, exercise.reference, textDone)
  const isComplete = textDone && drill.step === null

  useScrollToTarget({
    filledBlanks,
    filledRefSteps: drill.filled,
    inReferencePhase: drill.step !== null,
    targetRef: currentBlankRef,
    dockRef,
  })

  /** Callers add the miss to whichever counter their phase is graded on. */
  function rejectTap(tileId: number) {
    setCombo(0)
    setWrongTileId(tileId)
    flash(() => setWrongTileId(null))
  }

  function acceptTap() {
    setCombo((count) => count + 1)
    setWrongTileId(null)
  }

  function tapTile(tileId: number, position: number) {
    if (textDone || bank.spentTiles.has(tileId)) return

    const answer = blanks[filledBlanks].answer
    if (!wordsMatch(bank.labels[tileId], answer)) {
      setMisses((count) => count + 1)
      rejectTap(tileId)
      return
    }

    bank.spendTile(tileId, position, answer)
    acceptTap()
    setFilledBlanks(filledBlanks + 1)
  }

  // `wrongTileId` holds a chip position here rather than a tile id; the two
  // banks never render together, so they can share it.
  function tapRefChip(choice: string, position: number) {
    if (!drill.step) return

    if (choice !== drill.step.answer) {
      drill.addMiss()
      rejectTap(position)
      return
    }

    // The combo runs on through the phase change — it's one unbroken streak.
    acceptTap()
    drill.advance()
  }

  return (
    <div className='exercise-pane'>
      <div className='chip-row'>
        <StageChip exercise={exercise} />
        <ScoreChip
          filled={drill.phase ? drill.filled : filledBlanks}
          total={drill.phase ? drill.phase.length : blanks.length}
          noun={drill.phase ? 'steps' : 'blanks'}
          combo={combo}
          misses={drill.phase ? drill.misses : misses}
          slipBudget={drill.phase ? drill.slipBudget : slipBudget}
        />
      </div>

      <div className='verse-card'>
        <div className='verse-card-head'>
          {drill.phase ? (
            <ReferenceLine steps={drill.phase} filled={drill.filled} />
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
          {drill.board
            ? REFERENCE_PROMPTS[drill.board.kind]
            : 'Tap the missing words'}
        </p>

        {drill.board ? (
          <ReferenceBank
            board={drill.board}
            isDone={drill.step === null}
            wrongPosition={wrongTileId}
            minHeight={bank.bankHeight}
            onTap={tapRefChip}
          />
        ) : (
          <WordBank
            tileIds={bank.onScreen}
            labels={bank.labels}
            spentTiles={bank.spentTiles}
            wrongTileId={wrongTileId}
            disabled={textDone}
            height={bank.bankHeight}
            bankRef={bank.bankRef}
            onTap={tapTile}
          />
        )}

        <NextButton
          isLast={isLast}
          pending={pending}
          disabled={!isComplete}
          style={{ marginTop: 20 }}
          onClick={() =>
            onComplete(misses <= slipBudget && drill.misses <= drill.slipBudget)
          }
        />
      </div>
    </div>
  )
}
