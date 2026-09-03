import type { SessionTodayResponse } from '../../api/types'

/**
 * Memorized verses coming back for full recall today. Conditional on what the
 * session returns — it may legitimately be nothing — so nothing stands in for
 * it while the session is in flight.
 */
export default function DueCard({
  session,
}: {
  session: SessionTodayResponse | null
}) {
  if (!session) return null
  const due = new Set(
    session.exercises.filter((e) => e.queue === 'review').map((e) => e.verseId),
  ).size
  if (due === 0) return null

  return (
    <div className='due-card'>
      <div className='eyebrow' style={{ color: 'var(--amber-soft)' }}>
        Coming back today
      </div>
      <div className='due-row'>
        <span className='due-count'>{due}</span>
        <span className='due-what'>
          memorized {due === 1 ? 'verse' : 'verses'} due for full recall
        </span>
      </div>
      <p className='due-copy'>
        They return right when you&rsquo;d start to forget. Included in
        today&rsquo;s session.
      </p>
    </div>
  )
}
