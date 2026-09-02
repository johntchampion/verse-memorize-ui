import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { VerseListItem } from '../api/types'
import TabBar from '../components/TabBar'
import TranslationTag from '../components/TranslationTag'
import { useApi } from '../hooks/useApi'

/**
 * A verse is "memorized" once it has graduated out of the learning slots —
 * but not while it's queued for relearning. Such a verse still reports
 * `status: 'review'` (status is derived from `stage`, which doesn't change
 * while it's parked), so it would otherwise be counted as memorized while
 * actually being on its way back into practice.
 */
function isMemorized(verse: VerseListItem): boolean {
  if (verse.needsRelearning) return false
  return verse.status === 'review' || verse.status === 'mastered'
}

function dotClass(verse: VerseListItem): string {
  if (verse.needsRelearning) return 'arc-dot arc-dot-relearn'
  if (isMemorized(verse)) return 'arc-dot arc-dot-memorized'
  if (verse.status === 'active') return 'arc-dot arc-dot-practicing'
  return 'arc-dot'
}

function StatusChip({ verse }: { verse: VerseListItem }) {
  if (verse.needsRelearning)
    return <span className='chip chip-relearn'>Relearning</span>
  if (isMemorized(verse))
    return <span className='chip chip-mastered'>Memorized</span>
  if (verse.status === 'active')
    return <span className='chip chip-practice'>In practice</span>
  return null
}

/**
 * The All tab: every verse in the arc, in order — one flat list, memorized
 * ones green, the rest waiting their turn.
 */
export default function AllVerses() {
  const { data, loading, error, refetch } = useApi(() => api.verses())

  if (loading) {
    return (
      <>
        <main className='shell shell-tabbed'>
          <p className='muted'>Loading…</p>
        </main>
        <TabBar />
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <main className='shell shell-tabbed stack'>
          <p className='error-text'>{error ?? 'Something went wrong.'}</p>
          <button className='btn-ghost' onClick={refetch}>
            Try again
          </button>
        </main>
        <TabBar />
      </>
    )
  }

  const total = data.verses.length
  const memorized = data.verses.filter(isMemorized).length
  const practicing = data.verses.filter((v) => v.status === 'active').length

  return (
    <>
      <main className='shell shell-tabbed'>
        <header className='screen-header' style={{ marginBottom: 0 }}>
          <h1 className='view-title'>The Hundred</h1>
          <span style={{ flex: 1 }} />
          <TranslationTag code={data.translation} />
        </header>
        <p className='view-sub'>
          Every verse in the curriculum, in canon order.
        </p>

        <div className='card' style={{ marginTop: 18, padding: '16px 18px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>
              {memorized} memorized · {practicing} in practice
            </span>
            <span className='small muted' style={{ fontWeight: 700 }}>
              of {total}
            </span>
          </div>
          <div className='hundred-bar' aria-hidden='true'>
            <span
              className='hundred-bar-memorized'
              style={{ width: `${(memorized / total) * 100}%` }}
            />
            <span
              className='hundred-bar-practicing'
              style={{ width: `${(practicing / total) * 100}%` }}
            />
          </div>
        </div>

        <div className='arc-list'>
          {data.verses.map((verse) => (
            <Link
              key={verse.id}
              to={`/verses/${verse.id}`}
              className='arc-row'
              style={{ color: 'inherit' }}
            >
              <span className={dotClass(verse)} aria-hidden='true' />
              <div className='arc-main'>
                <div className='arc-head'>
                  <span className='arc-ref'>{verse.reference}</span>
                  <StatusChip verse={verse} />
                </div>
                <p className='arc-snippet'>{verse.text}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <TabBar />
    </>
  )
}
