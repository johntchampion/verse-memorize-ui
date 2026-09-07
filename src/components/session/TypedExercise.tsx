import { useState } from 'react'
import type { SessionExercise } from '../../api/types'
import TranslationTag from '../TranslationTag'
import { normalizeTypedText, usesReferencePhase } from '../../lib/exercise'
import { referencesMatch } from '../../lib/reference'
import { StageChip } from './ExerciseChips'
import NextButton from './NextButton'
import TypedResult, {
  type ReferenceOutcome,
  type TypedOutcome,
} from './TypedResult'
import ReferencePrompt from './ReferencePrompt'

interface Props {
  exercise: SessionExercise
  fullText: string
  translation: string
  isLast: boolean
  pending: boolean
  onComplete: (correct: boolean) => void
}

/** The reference line with nothing in it, so the question can be asked. */
function HiddenReference() {
  return (
    <p className='verse-ref ref-line' aria-label='Reference hidden'>
      <span className='blank ref-slot ref-book'> </span>
      <span className='ref-locus'>
        <span className='blank ref-slot'> </span>
        <span aria-hidden='true'>:</span>
        <span className='blank ref-slot'> </span>
      </span>
    </p>
  )
}

/**
 * Typed exercise: full recall into one free-text input, validated on "Check".
 * Case, punctuation and spacing are forgiven; the words must all be there, in
 * order. "Show the verse" trades the attempt for a re-read.
 *
 * Checking then asks for the reference, which was the *prompt* here — hiding it
 * the moment Check is pressed is what makes it a question. It is asked even
 * after a wrong or shown verse: branching would double the state machine.
 */
export default function TypedExercise({
  exercise,
  fullText,
  translation,
  isLast,
  pending,
  onComplete,
}: Props) {
  const [value, setValue] = useState('')
  const [result, setResult] = useState<TypedOutcome | null>(null)
  const [refResult, setRefResult] = useState<ReferenceOutcome>(null)

  // Stage alone — unlike the tile path this needs no decomposition, since
  // `referencesMatch` falls back to a string compare for anything odd.
  const asksReference = usesReferencePhase(exercise.stage)
  const askingReference = result !== null && asksReference && refResult === null
  const judged = result !== null && (!asksReference || refResult !== null)
  const passed = result === 'correct' && refResult !== 'incorrect'

  function check() {
    setResult(
      normalizeTypedText(value) === normalizeTypedText(fullText)
        ? 'correct'
        : 'incorrect',
    )
  }

  function checkReference(typed: string) {
    setRefResult(
      referencesMatch(typed, exercise.reference) ? 'correct' : 'incorrect',
    )
  }

  return (
    <div className='stack'>
      <div style={{ display: 'flex' }}>
        <StageChip exercise={exercise} reviewLabel='Review · from memory' />
      </div>

      <div className='verse-card'>
        <div className='verse-card-head' style={{ marginBottom: 0 }}>
          {askingReference ? (
            <HiddenReference />
          ) : (
            <p className='verse-ref'>{exercise.reference}</p>
          )}
          <TranslationTag code={translation} />
        </div>
        <p className='small muted' style={{ fontWeight: 600, marginTop: 6 }}>
          Write it out. Spelling and punctuation are forgiven.
        </p>
        <textarea
          className='typed-input'
          style={{ marginTop: 14 }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={result !== null}
          autoCapitalize='sentences'
          autoCorrect='off'
          spellCheck={false}
          aria-label='Type the verse from memory'
        />
        {result === null && (
          <div className='peek-row'>
            <span className='peek-label'>Stuck?</span>
            <button
              type='button'
              className='peek-btn'
              onClick={() => setResult('shown')}
            >
              Show the verse
            </button>
          </div>
        )}
      </div>

      {result === null && (
        <button
          type='button'
          className='btn'
          onClick={check}
          disabled={value.trim().length === 0}
        >
          Check
        </button>
      )}

      {askingReference && <ReferencePrompt onCheck={checkReference} />}

      {judged && result !== null && (
        <>
          <TypedResult
            result={result}
            refResult={refResult}
            fullText={fullText}
            reference={exercise.reference}
            passed={passed}
          />
          <NextButton
            isLast={isLast}
            pending={pending}
            onClick={() => onComplete(passed)}
          />
        </>
      )}
    </div>
  )
}
