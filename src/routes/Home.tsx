import { Link } from 'react-router-dom';
import { api } from '../api/client';
import SlotRow from '../components/SlotRow';
import StreakBadge from '../components/StreakBadge';
import { useApi } from '../hooks/useApi';

/** Rough pacing for the CTA subtitle — about 35 seconds per exercise. */
const SECONDS_PER_EXERCISE = 35;

export default function Home() {
  const me = useApi(() => api.me());
  const session = useApi(() => api.sessionToday());
  // Verse texts feed the slot-card snippets and the browse-button counts;
  // the screen renders without them if this fetch fails.
  const verses = useApi(() => api.verses());

  if (me.loading || session.loading || verses.loading) {
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
            verses.refetch();
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
  const minutes = Math.max(1, Math.round((exercises.length * SECONDS_PER_EXERCISE) / 60));

  const textById = new Map(verses.data?.verses.map((v) => [v.id, v.text]) ?? []);
  const totalVerses = verses.data?.verses.length ?? null;
  const startedVerses = verses.data?.verses.filter((v) => v.status !== 'locked').length ?? null;

  return (
    <main className="shell stack">
      <header className="screen-header" style={{ justifyContent: 'space-between', marginBottom: 0 }}>
        <span className="wordmark">Verse Memorize</span>
        <Link to="/settings" className="icon-btn" aria-label="Settings">
          ⚙
        </Link>
      </header>

      <StreakBadge streak={me.data.streak} pendingToday={exercises.length > 0} />

      {exercises.length > 0 ? (
        <Link to="/session" className="cta">
          <span className="cta-inner">
            <span>
              <span className="cta-title">Start today&rsquo;s practice</span>
              <span className="cta-sub">
                {verseCount} {verseCount === 1 ? 'verse' : 'verses'} · {exercises.length}{' '}
                {exercises.length === 1 ? 'exercise' : 'exercises'} · about {minutes} min
              </span>
            </span>
            <span className="cta-arrow" aria-hidden="true">
              →
            </span>
          </span>
        </Link>
      ) : (
        <div className="card">
          <p style={{ fontWeight: 800 }}>All caught up</p>
          <p className="small muted" style={{ marginTop: 2 }}>
            Nothing due today. Come back tomorrow.
          </p>
        </div>
      )}

      <div className="section-row" style={{ marginTop: 12 }}>
        <span className="eyebrow">You&rsquo;re practicing</span>
        <span className="small muted" style={{ fontWeight: 700 }}>
          {slots.active.length} of {slots.max} slots
        </span>
      </div>

      <section className="stack" style={{ gap: 12 }} aria-label="Learning slots">
        {Array.from({ length: slots.max }, (_, i) => {
          const slot = i + 1;
          const verse = slots.active.find((v) => v.slot === slot) ?? null;
          return (
            <SlotRow
              key={slot}
              slot={slot}
              verse={verse}
              unlocked={slots.unlocked}
              snippet={verse ? (textById.get(verse.verseId) ?? null) : null}
            />
          );
        })}
      </section>

      <Link to="/verses" className="btn-ghost">
        {totalVerses !== null
          ? `Browse all ${totalVerses} verses${startedVerses ? ` · ${startedVerses} started` : ''}`
          : 'Browse all verses'}
      </Link>
    </main>
  );
}
