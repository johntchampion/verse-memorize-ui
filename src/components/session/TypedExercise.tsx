import { useState } from 'react'
import type { SessionExercise } from '../../api/types'
import TranslationTag from '../TranslationTag'
import { normalizeTypedText, usesReferencePhase } from '../../lib/exercise'
import { referencesMatch } from '../../lib/reference'
import { StageChip } from './ExerciseChips'
import NextButton from './NextButton'

interface Props {
  exercise: SessionExercise
  fullText: string
  translation: string
  isLast: boolean
  pending: boolean
  onComplete: (correct: boolean) => void
}

type Result = 'correct' | 'incorrect' | 'shown' | null
type RefResult = 'correct' | 'incorrect' | null

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
 * Typed exercise: full recall into one free-text input, validated only on
 * "Check". Case, punctuation and spacing are forgiven; the words must all be
 * there, in order. "Show the verse" trades the attempt for a re-read —
 * recorded as a miss, but gentler than guessing blind.
 *
 * Checking then asks for the reference. Here it was the *prompt* — the only
 * cue saying which verse to write — so this tests whether the pairing stuck
 * rather than blind recall, and hiding it the moment Check is pressed is what
 * makes it a question at all. It is asked even after a wrong or shown verse:
 * the drill's value doesn't depend on the text being right, and branching
 * would double the state machine.
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
  const [result, setResult] = useState<Result>(null)
  const [refValue, setRefValue] = useState('')
  const [refResult, setRefResult] = useState<RefResult>(null)

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

  function checkReference() {
    setRefResult(
      referencesMatch(refValue, exercise.reference) ? 'correct' : 'incorrect',
    )
  }

  const headline =
    result === 'correct'
      ? refResult === 'incorrect'
        ? 'Word for word — but that reference isn’t it.'
        : 'Word for word. Kept it.'
      : result === 'shown'
        ? 'Shown — read it through. It comes back around.'
        : 'Not quite. Read it again:'

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

      {askingReference && (
        <div className='stack'>
          <p className='small muted' style={{ fontWeight: 600 }}>
            Where is it? Book, chapter and verse.
          </p>
          <input
            type='text'
            className='ref-input'
            value={refValue}
            onChange={(e) => setRefValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && refValue.trim().length > 0) {
                checkReference()
              }
            }}
            placeholder='Book chapter:verse'
            autoCapitalize='words'
            autoCorrect='off'
            spellCheck={false}
            enterKeyHint='done'
            aria-label='Type the reference'
          />
          <button
            type='button'
            className='btn'
            onClick={checkReference}
            disabled={refValue.trim().length === 0}
          >
            Check reference
          </button>
        </div>
      )}

      {judged && (
        <>
          <div
            className={`result-card ${passed ? 'result-correct' : 'result-incorrect'}`}
            role='status'
          >
            <p className='result-headline'>
              <span aria-hidden='true'>
                {result === 'correct' ? '✓' : result === 'shown' ? '👀' : '↺'}
              </span>
              {headline}
            </p>
            <p className='result-verse'>{fullText}</p>
            {refResult !== null && (
              <p className='result-reference'>
                <span aria-hidden='true'>
                  {refResult === 'correct' ? '✓' : '✗'}
                </span>
                {exercise.reference}
              </p>
            )}
          </div>
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
