import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { VerseListItem } from '../api/types';
import TabBar from '../components/TabBar';
import { useApi } from '../hooks/useApi';

/** A verse is "kept" once it has graduated out of the learning slots. */
function isKept(verse: VerseListItem): boolean {
  return verse.status === 'review' || verse.status === 'mastered';
}

function dotClass(verse: VerseListItem): string {
  if (verse.decayed) return 'arc-dot arc-dot-decayed';
  if (isKept(verse)) return 'arc-dot arc-dot-kept';
  if (verse.status === 'active') return 'arc-dot arc-dot-practicing';
  return 'arc-dot';
}

function StatusChip({ verse }: { verse: VerseListItem }) {
  if (verse.decayed) return <span className="chip chip-decayed">Needs review</span>;
  if (isKept(verse)) return <span className="chip chip-mastered">Kept</span>;
  if (verse.status === 'active') return <span className="chip chip-practice">In practice</span>;
  return null;
}

/**
 * The All tab: every verse in the arc, in order — one flat list, kept ones
 * green, the rest waiting their turn.
 */
export default function AllVerses() {
  const { data, loading, error, refetch } = useApi(() => api.verses());

  if (loading) {
    return (
      <>
        <main className="shell shell-tabbed">
          <p className="muted">Loading…</p>
        </main>
        <TabBar />
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <main className="shell shell-tabbed stack">
          <p className="error-text">{error ?? 'Something went wrong.'}</p>
          <button className="btn-ghost" onClick={refetch}>
            Try again
          </button>
        </main>
        <TabBar />
      </>
    );
  }

  const total = data.verses.length;
  const kept = data.verses.filter(isKept).length;
  const practicing = data.verses.filter((v) => v.status === 'active').length;

  return (
    <>
      <main className="shell shell-tabbed">
        <h1 className="view-title">The hundred</h1>
        <p className="view-sub">Every verse in the arc, in order. Kept ones stay kept.</p>

        <div className="card" style={{ marginTop: 18, padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>
              {kept} kept · {practicing} in practice
            </span>
            <span className="small muted" style={{ fontWeight: 700 }}>
              of {total}
            </span>
          </div>
          <div className="hundred-bar" aria-hidden="true">
            <span className="hundred-bar-kept" style={{ width: `${(kept / total) * 100}%` }} />
            <span
              className="hundred-bar-practicing"
              style={{ width: `${(practicing / total) * 100}%` }}
            />
          </div>
        </div>

        <div className="arc-list">
          {data.verses.map((verse) => {
            const inner = (
              <>
                <span className={dotClass(verse)} aria-hidden="true" />
                <div className="arc-main">
                  <div className="arc-head">
                    <span className="arc-ref">{verse.reference}</span>
                    <StatusChip verse={verse} />
                  </div>
                  {verse.text && <p className="arc-snippet">{verse.text}</p>}
                </div>
              </>
            );
            return verse.status === 'locked' ? (
              <div key={verse.id} className="arc-row arc-row-locked">
                {inner}
              </div>
            ) : (
              <Link key={verse.id} to={`/verses/${verse.id}`} className="arc-row" style={{ color: 'inherit' }}>
                {inner}
              </Link>
            );
          })}
        </div>
      </main>
      <TabBar />
    </>
  );
}
