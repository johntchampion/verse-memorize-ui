import { useState } from 'react';
import type { SessionExercise } from '../api/types';
import { STAGE_LABELS, normalizeTypedText } from '../lib/exercise';

interface Props {
  exercise: SessionExercise;
  fullText: string;
  onComplete: (correct: boolean) => void;
}

/** "The Lord is my shepherd" → "T L i m s" — a nudge, not the answer. */
function firstLetters(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const match = /[\p{L}\p{N}]/u.exec(token);
      return match ? token.slice(0, match.index + 1) : token;
    })
    .join(' ');
}

type Result = 'correct' | 'incorrect' | 'shown' | null;

/**
 * Typed exercise: full recall into one free-text input, validated only on
 * "Check". Case, punctuation and spacing are forgiven; the words must all be
 * there, in order. When stuck, a peek at first letters keeps the attempt
 * honest, while "Show the verse" trades the attempt for a re-read — recorded
 * as a miss, but gentler than guessing blind.
 */
export default function TypedExercise({ exercise, fullText, onComplete }: Props) {
  const [value, setValue] = useState('');
  const [peeked, setPeeked] = useState(false);
  const [result, setResult] = useState<Result>(null);

  function check() {
    setResult(normalizeTypedText(value) === normalizeTypedText(fullText) ? 'correct' : 'incorrect');
  }

  const headline =
    result === 'correct'
      ? 'Word for word. Kept it.'
      : result === 'shown'
        ? 'Shown — read it through. It comes back around.'
        : 'Not quite. Read it again:';

  return (
    <div className="stack">
      <div style={{ display: 'flex' }}>
        <span className={exercise.queue === 'review' ? 'chip chip-review' : 'chip chip-active'}>
          {exercise.queue === 'review' ? 'Review · from memory' : STAGE_LABELS[exercise.stage]}
        </span>
      </div>

      <div className="verse-card">
        <p className="verse-ref" style={{ marginBottom: 0 }}>
          {exercise.reference}
        </p>
        <p className="small muted" style={{ fontWeight: 600, marginTop: 6 }}>
          Write it out. Spelling and punctuation are forgiven.
        </p>
        <textarea
          className="typed-input"
          style={{ marginTop: 14 }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={result !== null}
          autoCapitalize="sentences"
          autoCorrect="off"
          spellCheck={false}
          aria-label={`Type ${exercise.reference} from memory`}
        />
        {peeked && result === null && <p className="first-letters">{firstLetters(fullText)}</p>}
        {result === null && (
          <div className="peek-row">
            <span className="peek-label">Stuck?</span>
            <button type="button" className="peek-btn" onClick={() => setPeeked(true)} disabled={peeked}>
              Peek at first letters
            </button>
            <button type="button" className="peek-btn" onClick={() => setResult('shown')}>
              Show the verse
            </button>
          </div>
        )}
      </div>

      {result === null ? (
        <button type="button" className="btn" onClick={check} disabled={value.trim().length === 0}>
          Check
        </button>
      ) : (
        <>
          <div
            className={`result-card ${result === 'correct' ? 'result-correct' : 'result-incorrect'}`}
            role="status"
          >
            <p className="result-headline">
              <span aria-hidden="true">{result === 'correct' ? '✓' : result === 'shown' ? '👀' : '↺'}</span>
              {headline}
            </p>
            <p className="result-verse">{fullText}</p>
          </div>
          <button type="button" className="btn" onClick={() => onComplete(result === 'correct')}>
            Next verse →
          </button>
        </>
      )}
    </div>
  );
}
