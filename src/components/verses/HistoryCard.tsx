import type { VerseDetailResponse } from '../../api/types'

const RECENT_ATTEMPTS_SHOWN = 10

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Every attempt on this verse: the hit rate, a block strip, and the ten most
 * recent in words. Absent until there is a first attempt to show.
 */
export default function HistoryCard({
  detail,
}: {
  detail: VerseDetailResponse | null
}) {
  if (!detail || detail.history.total === 0) return null

  const { history } = detail
  const recent = history.attempts.slice(0, RECENT_ATTEMPTS_SHOWN)
  // Attempts arrive newest first; the block strip reads oldest → newest.
  const blocks = [...recent].reverse()

  return (
    <section className='card' aria-label='Attempt history'>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <span className='eyebrow'>History</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
          {history.correct} of {history.total} ·{' '}
          {Math.round((history.correct / history.total) * 100)}%
        </span>
      </div>
      <div className='history-blocks' aria-hidden='true'>
        {blocks.map((attempt) => (
          <span
            key={attempt.id}
            className={
              attempt.correct === 1
                ? 'history-block history-block-correct'
                : 'history-block history-block-incorrect'
            }
          />
        ))}
      </div>
      {blocks.length > 0 && (
        <div
          className='small muted'
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 8,
            fontWeight: 700,
            fontSize: '0.72rem',
          }}
        >
          <span>{formatDay(blocks[0].created_at)}</span>
          <span>most recent</span>
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        {recent.map((attempt) => (
          <div key={attempt.id} className='attempt-row'>
            <span
              className={
                attempt.correct === 1 ? 'attempt-correct' : 'attempt-incorrect'
              }
            >
              {attempt.correct === 1 ? '✓ Correct' : '✗ Missed'}
            </span>
            <span className='muted'>
              {attempt.exercise_type === 'tile_fill_blank' ? '' : '👑 '}
              {formatDate(attempt.created_at)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
