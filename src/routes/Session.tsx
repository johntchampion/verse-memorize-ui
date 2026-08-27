import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { SessionExercise } from '../api/types';
import ProgressBar from '../components/ProgressBar';
import TileExercise from '../components/TileExercise';
import TypedExercise from '../components/TypedExercise';
import { STAGE_LABELS, stageChangeMessage } from '../lib/exercise';

type Phase = 'loading' | 'empty' | 'running' | 'finishing' | 'done';

interface ErrorState {
  message: string;
  retry: () => void;
}

const TOAST_MS = 2500;

/**
 * The exercise runner. Holds today's queue in local state and steps through
 * it one exercise at a time; only submitted answers round-trip
 * to the server. Answers are judged client-side against the full verse text,
 * fetched per verse up front.
 */
export default function Session() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [queue, setQueue] = useState<SessionExercise[]>([]);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [completion, setCompletion] = useState<{ recorded: boolean; streak: number | null } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setPhase('loading');
    try {
      const today = await api.sessionToday();
      if (today.exercises.length === 0) {
        setPhase('empty');
        return;
      }
      // Every queued verse is unlocked for this user, so its full text is
      // available — it's the answer key for both exercise types.
      const ids = [...new Set(today.exercises.map((e) => e.verseId))];
      const details = await Promise.all(ids.map((id) => api.verse(id)));
      const byId: Record<string, string> = {};
      for (const detail of details) {
        if (!detail.verse.text) throw new Error('verse text unavailable');
        byId[detail.verse.id] = detail.verse.text;
      }
      setQueue(today.exercises);
      setTexts(byId);
      setIndex(0);
      setPhase('running');
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Could not load today’s session.',
        retry: () => void load(),
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const finish = useCallback(async () => {
    setError(null);
    setPhase('finishing');
    try {
      const result = await api.sessionComplete();
      let streak: number | null = null;
      try {
        streak = (await api.me()).streak;
      } catch {
        // The session is already recorded; a failed streak fetch shouldn't
        // block the completion screen.
      }
      setCompletion({ recorded: result.recorded, streak });
      setPhase('done');
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Could not record the session.',
        retry: () => void finish(),
      });
    }
  }, []);

  // A function declaration (hoisted) so the retry closure can re-invoke it.
  async function submit(correct: boolean) {
    if (submitting) return;
    setSubmitting(true);
    const exercise = queue[index];
    try {
      const outcome = await api.attempt(exercise.userVerseId, exercise.exerciseType, correct);
      const message = stageChangeMessage(exercise.stage, outcome.userVerse.stage);
      if (message) setToast(message);
      if (index + 1 < queue.length) {
        setIndex(index + 1);
      } else {
        await finish();
      }
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Could not save that answer.',
        retry: () => {
          setError(null);
          void submit(correct);
        },
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <main className="shell stack">
        <p className="error-text" role="alert">{error.message}</p>
        <button className="btn" onClick={error.retry}>Try again</button>
        <Link to="/" className="btn-ghost">Back to home</Link>
      </main>
    );
  }

  if (phase === 'loading' || phase === 'finishing') {
    return (
      <main className="shell">
        <p className="muted">{phase === 'loading' ? 'Preparing today’s session…' : 'Wrapping up…'}</p>
      </main>
    );
  }

  if (phase === 'empty') {
    return (
      <main className="shell stack">
        <p className="eyebrow">Today&rsquo;s session</p>
        <h1 style={{ fontFamily: 'var(--serif)' }}>All caught up</h1>
        <p className="muted">Nothing is due right now. Come back tomorrow.</p>
        <Link to="/" className="btn-ghost">Back to home</Link>
      </main>
    );
  }

  if (phase === 'done' && completion) {
    return (
      <main className="shell stack">
        <p className="eyebrow">Session complete</p>
        <h1 style={{ fontFamily: 'var(--serif)' }}>Well done</h1>
        <p>
          <strong>{queue.length}</strong> {queue.length === 1 ? 'exercise' : 'exercises'} finished.
        </p>
        {completion.streak !== null && (
          <div className="streak-badge">
            <span className="streak-count">{completion.streak}</span>
            <span className="muted">day streak</span>
          </div>
        )}
        {!completion.recorded && (
          <p className="small muted">Today&rsquo;s session was already counted — extra practice never hurts.</p>
        )}
        <Link to="/" className="btn">Back to home</Link>
      </main>
    );
  }

  const exercise = queue[index];
  const fullText = texts[exercise.verseId];

  return (
    <main className="shell stack">
      {toast && <div className="toast" role="status">{toast}</div>}

      <header className="stack" style={{ gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="small muted">
            {index + 1} of {queue.length} ·{' '}
            {exercise.queue === 'review' ? 'Review' : STAGE_LABELS[exercise.stage]}
          </span>
          <Link to="/" className="small">Exit</Link>
        </div>
        <ProgressBar done={index} total={queue.length} />
      </header>

      {exercise.exerciseType === 'tile_fill_blank' ? (
        <TileExercise
          key={index}
          exercise={exercise}
          fullText={fullText}
          onComplete={(correct) => void submit(correct)}
        />
      ) : (
        <TypedExercise
          key={index}
          exercise={exercise}
          fullText={fullText}
          onComplete={(correct) => void submit(correct)}
        />
      )}
    </main>
  );
}
