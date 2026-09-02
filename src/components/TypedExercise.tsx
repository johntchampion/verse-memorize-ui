import { useState } from 'react'
import type { SessionExercise } from '../api/types'
import TranslationTag from './TranslationTag'
import { STAGE_LABELS, normalizeTypedText } from '../lib/exercise'

interface Props {
  exercise: SessionExercise
  fullText: string
  translation: string
  isLast: boolean
  pending: boolean
  onComplete: (correct: boolean) => void
}

type Result = 'correct' | 'incorrect' | 'shown' | null

/**
 * Typed exercise: full recall into one free-text input, validated only on
 * "Check". Case, punctuation and spacing are forgiven; the words must all be
 * there, in order. "Show the verse" trades the attempt for a re-read —
 * recorded as a miss, but gentler than guessing blind.
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

  function check() {
    setResult(
      normalizeTypedText(value) === normalizeTypedText(fullText)
        ? 'correct'
        : 'incorrect',
    )
  }

  const headline =
    result === 'correct'
      ? 'Word for word. Kept it.'
      : result === 'shown'
        ? 'Shown — read it through. It comes back around.'
        : 'Not quite. Read it again:'

  return (
    <div className='stack'>
      <div style={{ display: 'flex' }}>
        <span
          className={
            exercise.queue === 'review'
              ? 'chip chip-review'
              : 'chip chip-active'
          }
        >
          {exercise.queue === 'review'
            ? 'Review · from memory'
            : STAGE_LABELS[exercise.stage]}
        </span>
      </div>

      <div className='verse-card'>
        <div className='verse-card-head' style={{ marginBottom: 0 }}>
          <p className='verse-ref'>{exercise.reference}</p>
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
          aria-label={`Type ${exercise.reference} from memory`}
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

      {result === null ? (
        <button
          type='button'
          className='btn'
          onClick={check}
          disabled={value.trim().length === 0}
        >
          Check
        </button>
      ) : (
        <>
          <div
            className={`result-card ${result === 'correct' ? 'result-correct' : 'result-incorrect'}`}
            role='status'
          >
            <p className='result-headline'>
              <span aria-hidden='true'>
                {result === 'correct' ? '✓' : result === 'shown' ? '👀' : '↺'}
              </span>
              {headline}
            </p>
            <p className='result-verse'>{fullText}</p>
          </div>
          <button
            type='button'
            className='btn'
            onClick={() => onComplete(result === 'correct')}
            disabled={pending}
            aria-busy={pending}
          >
            {pending && <span className='btn-spinner' aria-hidden='true' />}
            {isLast ? 'Finish session →' : 'Next verse →'}
          </button>
        </>
      )}
    </div>
  )
}
