import { Link } from 'react-router-dom'
import type { SessionEvent } from '../../lib/sessionEvents'

/**
 * The end of a session: the streak it kept, what it added up to, and every
 * verse that moved on the ladder along the way.
 */
export default function SessionComplete({
  streak,
  recorded,
  exercises,
  verses,
  correct,
  events,
}: {
  /** Null when the streak fetch failed — the session still counted. */
  streak: number | null
  /** False when today was already recorded; this was extra practice. */
  recorded: boolean
  exercises: number
  verses: number
  correct: number
  events: SessionEvent[]
}) {
  const cleanNote =
    correct === exercises
      ? 'a clean sweep'
      : correct > 0
        ? `zero misses on ${correct} of them`
        : 'every miss still teaches'

  return (
    <main className='complete-screen'>
      {streak !== null && (
        <>
          <div className='complete-circle'>
            <span className='complete-circle-count'>{streak}</span>
          </div>
          <div className='complete-eyebrow'>Day streak</div>
        </>
      )}
      <h1 className='complete-title'>Kept the day.</h1>
      <p className='complete-sub'>
        {exercises} {exercises === 1 ? 'exercise' : 'exercises'} · {verses}{' '}
        {verses === 1 ? 'verse' : 'verses'} · {cleanNote}
      </p>

      {events.length > 0 && (
        <div className='complete-events'>
          {events.map((event, i) => (
            <div key={i} className='complete-event'>
              <span
                className='complete-event-icon'
                style={{ background: event.iconBg }}
                aria-hidden='true'
              >
                {event.icon}
              </span>
              <div>
                <div className='complete-event-title'>{event.title}</div>
                <div
                  className='complete-event-detail'
                  style={{ color: event.detailColor }}
                >
                  {event.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!recorded && (
        <p className='small complete-sub'>
          Today&rsquo;s session was already counted — extra practice never hurts.
        </p>
      )}
      <Link to='/' className='btn' style={{ marginTop: 22 }}>
        Back home
      </Link>
    </main>
  )
}
