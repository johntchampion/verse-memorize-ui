import { useState } from 'react';
import type { SessionExercise } from '../api/types';
import { normalizeTypedText } from '../lib/exercise';

interface Props {
  exercise: SessionExercise;
  fullText: string;
  onComplete: (correct: boolean) => void;
}

/**
 * Typed exercise: full recall into one free-text input, validated only on
 * "Check". Case, punctuation and spacing are forgiven; the words must all be
 * there, in order.
 */
export default function TypedExercise({ exercise, fullText, onComplete }: Props) {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);

  function check() {
    setResult(normalizeTypedText(value) === normalizeTypedText(fullText) ? 'correct' : 'incorrect');
  }

  return (
    <div className="stack">
      <div>
        <p className="verse-ref">{exercise.reference}</p>
        <p className="muted small">Type the verse from memory.</p>
      </div>

      <textarea
        className="typed-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={result !== null}
        autoCapitalize="sentences"
        autoCorrect="off"
        spellCheck={false}
        aria-label={`Type ${exercise.reference} from memory`}
      />

      {result === null ? (
        <button type="button" className="btn" onClick={check} disabled={value.trim().length === 0}>
          Check
        </button>
      ) : (
        <>
          <p
            className={`result-banner ${result === 'correct' ? 'result-correct' : 'result-incorrect'}`}
            role="status"
          >
            {result === 'correct' ? 'Word for word — well done.' : 'Not quite. Read it again:'}
          </p>
          <p className="verse-text">{fullText}</p>
          <button type="button" className="btn" onClick={() => onComplete(result === 'correct')}>
            Continue
          </button>
        </>
      )}
    </div>
  );
}
