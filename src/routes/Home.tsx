import { Link } from 'react-router-dom';
import { api } from '../api/client';
import SlotRow from '../components/SlotRow';
import StreakBadge from '../components/StreakBadge';
import { useApi } from '../hooks/useApi';

export default function Home() {
  const me = useApi(() => api.me());
  const session = useApi(() => api.sessionToday());

  if (me.loading || session.loading) {
    return (
      <main className="shell">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (me.error || session.error || !me.data || !session.data) {
    return (
      <main className="shell stack">
        <p className="error-text">{me.error ?? session.error ?? 'Something went wrong.'}</p>
        <button
          className="btn-ghost"
          onClick={() => {
            me.refetch();
            session.refetch();
          }}
        >
          Try again
        </button>
      </main>
    );
  }

  const { slots } = me.data;
  const exercises = session.data.exercises;
  const verseCount = new Set(exercises.map((e) => e.verseId)).size;

  return (
    <main className="shell stack">
      <header className="screen-header" style={{ justifyContent: 'space-between' }}>
        <span className="eyebrow">Verse Memorize</span>
        <Link to="/settings" className="small">
          Settings
        </Link>
      </header>

      <StreakBadge streak={me.data.streak} />

      <section className="card stack" aria-label="Today's session">
        <p className="eyebrow">Today&rsquo;s session</p>
        {exercises.length > 0 ? (
          <>
            <p>
              <strong>{verseCount}</strong> {verseCount === 1 ? 'verse' : 'verses'} ·{' '}
              <strong>{exercises.length}</strong> {exercises.length === 1 ? 'exercise' : 'exercises'}
            </p>
            <Link to="/session" className="btn">
              Start practice
            </Link>
          </>
        ) : (
          <p className="muted">All caught up — nothing due today. Come back tomorrow.</p>
        )}
      </section>

      <section className="card" aria-label="Learning slots">
        <p className="eyebrow">Learning slots</p>
        {Array.from({ length: slots.max }, (_, i) => {
          const slot = i + 1;
          return (
            <SlotRow
              key={slot}
              slot={slot}
              verse={slots.active.find((v) => v.slot === slot) ?? null}
              unlocked={slots.unlocked}
            />
          );
        })}
      </section>

      <Link to="/verses" className="btn-ghost">
        Browse all 100 verses
      </Link>
    </main>
  );
}
