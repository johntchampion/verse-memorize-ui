import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { VerseListItem } from '../api/types';
import { STAGE_LABELS } from '../lib/exercise';
import { useApi } from '../hooks/useApi';

/** "Philippians 4:6" → "Philippians", for the group headings. */
function bookOf(reference: string): string {
  const match = /^(.+?)\s+\d+/.exec(reference);
  return match ? match[1] : reference;
}

function StatusChip({ verse }: { verse: VerseListItem }) {
  switch (verse.status) {
    case 'locked':
      return (
        <span style={{ fontSize: '0.85rem', color: 'var(--locked)' }} aria-label="Locked">
          🔒
        </span>
      );
    case 'active':
      return <span className="chip chip-active">{verse.stage ? STAGE_LABELS[verse.stage] : 'Learning'}</span>;
    case 'review':
      return verse.decayed ? (
        <span className="chip chip-decayed">Needs review</span>
      ) : (
        <span className="chip chip-review">Review</span>
      );
    case 'mastered':
      return <span className="chip chip-mastered">Mastered</span>;
  }
}

function cellClass(verse: VerseListItem): string {
  switch (verse.status) {
    case 'mastered':
      return 'kept-cell kept-mastered';
    case 'review':
      return 'kept-cell kept-review';
    case 'active':
      return 'kept-cell kept-active';
    default:
      return 'kept-cell';
  }
}

export default function VerseBank() {
  const { data, loading, error, refetch } = useApi(() => api.verses());

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
      </main>
    );
  }

  const started = data.verses.filter((v) => v.status !== 'locked').length;

  // Verses arrive in `order`; consecutive runs of the same book form groups.
  const groups: { book: string; verses: VerseListItem[] }[] = [];
  for (const verse of data.verses) {
    const book = bookOf(verse.reference);
    const last = groups[groups.length - 1];
    if (last && last.book === book) {
      last.verses.push(verse);
    } else {
      groups.push({ book, verses: [verse] });
    }
  }

  return (
    <main className="shell">
      <header className="screen-header">
        <Link to="/" className="icon-btn" aria-label="Back to home">
          ←
        </Link>
        <h1>Verse bank</h1>
      </header>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
            {started} of {data.verses.length} kept
          </span>
          <span className="small muted" style={{ fontWeight: 700 }}>
            no skipping ahead
          </span>
        </div>
        <div className="kept-grid" aria-hidden="true">
          {data.verses.map((verse) => (
            <span key={verse.id} className={cellClass(verse)} />
          ))}
        </div>
      </div>

      {groups.map((group) => (
        <section key={`${group.book}-${group.verses[0].order}`} aria-label={group.book}>
          <h2 className="book-heading">{group.book}</h2>
          <div className="verse-list">
            {group.verses.map((verse) =>
              verse.status === 'locked' ? (
                <div key={verse.id} className="verse-row verse-row-locked">
                  <span className="verse-row-reference">{verse.reference}</span>
                  <StatusChip verse={verse} />
                </div>
              ) : (
                <Link key={verse.id} to={`/verses/${verse.id}`} className="verse-row" style={{ color: 'inherit' }}>
                  <span className="verse-row-reference">{verse.reference}</span>
                  <StatusChip verse={verse} />
                </Link>
              ),
            )}
          </div>
        </section>
      ))}
    </main>
  );
}
