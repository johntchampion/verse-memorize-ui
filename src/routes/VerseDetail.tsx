import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { STAGE_LABELS } from '../lib/exercise';
import { useApi } from '../hooks/useApi';

const RECENT_ATTEMPTS_SHOWN = 10;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function VerseDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, refetch } = useApi(() => api.verse(id ?? ''));

  if (loading) {
    return (
      <main className="shell">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="shell stack">
        <p className="error-text">{error ?? 'Something went wrong.'}</p>
        <button className="btn-ghost" onClick={refetch}>Try again</button>
        <Link to="/verses" className="btn-ghost">Back to verse bank</Link>
      </main>
    );
  }

  const { verse, status, userVerse, schedule, history, graduatedAt } = data;
  const recent = history.attempts.slice(0, RECENT_ATTEMPTS_SHOWN);

  return (
    <main className="shell stack">
      <header className="screen-header">
        <Link to="/verses" className="back-link">← Verses</Link>
      </header>

      <section className="card">
        <p className="verse-ref">{verse.reference}</p>
        {verse.text ? (
          <p className="verse-text">{verse.text}</p>
        ) : (
          <p className="muted">This verse is still locked. Keep practicing to reach it.</p>
        )}
      </section>

      {userVerse && (
        <section className="card stack" aria-label="Progress">
          <p className="eyebrow">Progress</p>
          <p>
            {STAGE_LABELS[userVerse.stage]}
            {graduatedAt && (
              <span className="chip chip-mastered" style={{ marginLeft: 8 }}>
                Graduated {formatDate(graduatedAt)}
              </span>
            )}
          </p>
          <div>
            <div className="small muted" style={{ marginBottom: 4 }}>
              Strength {userVerse.strength}/100
            </div>
            <div className="strength-track">
              <div className="strength-fill" style={{ width: `${userVerse.strength}%` }} />
            </div>
          </div>
          {schedule && status !== 'locked' && (
            <p className="small muted">
              Next review {formatDate(`${schedule.due_at}T00:00:00`)} · every {schedule.interval_days}{' '}
              {schedule.interval_days === 1 ? 'day' : 'days'}
            </p>
          )}
        </section>
      )}

      {history.total > 0 && (
        <section className="card" aria-label="Attempt history">
          <p className="eyebrow">History</p>
          <p style={{ margin: '10px 0' }}>
            <strong>{history.correct}</strong> of <strong>{history.total}</strong> correct (
            {Math.round((history.correct / history.total) * 100)}%)
          </p>
          {recent.map((attempt) => (
            <div key={attempt.id} className="attempt-row">
              <span className={attempt.correct === 1 ? 'attempt-correct' : 'attempt-incorrect'}>
                {attempt.correct === 1 ? '✓ Correct' : '✗ Missed'}
              </span>
              <span className="muted">
                {attempt.exercise_type === 'tile_fill_blank' ? 'Tiles' : 'Typed'} ·{' '}
                {formatDate(attempt.created_at)}
              </span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
