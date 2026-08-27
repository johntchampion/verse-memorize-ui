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

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
  // Attempts arrive newest first; the block strip reads oldest → newest.
  const blocks = [...recent].reverse();

  return (
    <main className="shell stack">
      <header className="screen-header" style={{ marginBottom: 0 }}>
        <Link to="/verses" className="icon-btn" aria-label="Back to verses">
          ←
        </Link>
        <span className="small muted" style={{ fontWeight: 800 }}>
          Verses
        </span>
      </header>

      <section className="verse-card">
        <p className="verse-ref">{verse.reference}</p>
        {verse.text ? (
          <p className="verse-text" style={{ lineHeight: 1.7 }}>{verse.text}</p>
        ) : (
          <p className="muted">This verse is still locked. Keep practicing to reach it.</p>
        )}
      </section>

      {userVerse && (
        <section className="card" aria-label="Progress">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="eyebrow">Progress</span>
            <span className={graduatedAt ? 'chip chip-mastered' : 'chip chip-active'}>
              {STAGE_LABELS[userVerse.stage]}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 14 }}>
            <span className="strength-number">{userVerse.strength}</span>
            <span className="small muted" style={{ fontWeight: 700 }}>
              strength / 100
            </span>
          </div>
          <div className="strength-track" style={{ marginTop: 10 }}>
            <div className="strength-fill" style={{ width: `${userVerse.strength}%` }} />
          </div>
          {(schedule || graduatedAt) && status !== 'locked' && (
            <div className="stat-tiles" style={{ marginTop: 14 }}>
              {schedule && (
                <>
                  <div className="stat-tile">
                    <div className="stat-tile-value">{formatDay(`${schedule.due_at}T00:00:00`)}</div>
                    <div className="stat-tile-label">next review</div>
                  </div>
                  <div className="stat-tile">
                    <div className="stat-tile-value">
                      Every {schedule.interval_days} {schedule.interval_days === 1 ? 'day' : 'days'}
                    </div>
                    <div className="stat-tile-label">interval</div>
                  </div>
                </>
              )}
              {graduatedAt && (
                <div className="stat-tile">
                  <div className="stat-tile-value">{formatDay(graduatedAt)}</div>
                  <div className="stat-tile-label">graduated</div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {history.total > 0 && (
        <section className="card" aria-label="Attempt history">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="eyebrow">History</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
              {history.correct} of {history.total} · {Math.round((history.correct / history.total) * 100)}%
            </span>
          </div>
          <div className="history-blocks" aria-hidden="true">
            {blocks.map((attempt) => (
              <span
                key={attempt.id}
                className={
                  attempt.correct === 1 ? 'history-block history-block-correct' : 'history-block history-block-incorrect'
                }
              />
            ))}
          </div>
          {blocks.length > 0 && (
            <div
              className="small muted"
              style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontWeight: 700, fontSize: '0.72rem' }}
            >
              <span>{formatDay(blocks[0].created_at)}</span>
              <span>most recent</span>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
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
          </div>
        </section>
      )}
    </main>
  );
}
