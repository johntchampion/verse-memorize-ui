import { type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { SessionEvent } from '../../lib/sessionEvents'

/** Rows enter in turn, but a long list shouldn't push the way out off the end. */
const ROW_STEP = 60
const ROW_CAP = 6
const ROWS_AT = 420

/** The screen assembles top-down; each block waits its turn to rise in. */
const enter = (ms: number) => ({ '--enter': `${ms}ms` }) as CSSProperties

/**
 * The end of a session: the streak it kept, what it added up to, and every
 * verse that moved on the ladder along the way.
 *
 * It arrives in pieces rather than all at once, and the streak is the piece it
 * arrives for — the ring draws itself closed and the count turns over as it
 * lands. That only happens when this session is what recorded the day; extra
 * practice on a day already kept has nothing to turn over.
 */
export default function SessionComplete({
  streak,
  recorded,
  practice,
  exercises,
  verses,
  correct,
  events,
}: {
  /** Null when the streak fetch failed — the session still counted. */
  streak: number | null
  /** False when today was already recorded; this was extra practice. */
  recorded: boolean
  /** A drill rather than the day's path: it moved verses, but kept no day. */
  practice?: boolean
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

  // Recording the day is what moved the streak, so the number we arrived with
  // was one lower — the first day of all included, which is the turn from
  // nothing to something and the one most worth watching. Null when this
  // session moved nothing: a day already kept has no increment to show.
  const previous = recorded && streak !== null && streak >= 1 ? streak - 1 : null

  const tail = ROWS_AT + Math.min(events.length, ROW_CAP) * ROW_STEP

  return (
    <main className='complete-screen'>
      {streak !== null && (
        <>
          <div
            className='complete-circle complete-rise'
            style={enter(0)}
            role='img'
            aria-label={`${streak} day streak`}
          >
            {previous === null ? (
              <span className='complete-circle-count' aria-hidden='true'>
                {streak}
              </span>
            ) : (
              /* Both numbers are on screen the whole time, stacked in one
                 grid cell. The turn-over is two halves of one movement rather
                 than a swap, so there is never a moment with no number in the
                 ring. */
              <span
                className='complete-circle-count complete-roll'
                aria-hidden='true'
              >
                <span className='complete-roll-out'>{previous}</span>
                <span className='complete-roll-in'>{streak}</span>
              </span>
            )}
          </div>
          <div className='complete-eyebrow complete-rise' style={enter(140)}>
            Day streak
          </div>
        </>
      )}
      <h1 className='complete-title complete-rise' style={enter(220)}>
        {practice ? 'Another round down.' : 'Kept the day.'}
      </h1>
      <p className='complete-sub complete-rise' style={enter(280)}>
        {exercises} {exercises === 1 ? 'exercise' : 'exercises'} · {verses}{' '}
        {verses === 1 ? 'verse' : 'verses'} · {cleanNote}
      </p>

      {events.length > 0 && (
        <div className='complete-events complete-rise' style={enter(360)}>
          {events.map((event, i) => (
            <div
              key={i}
              className='complete-event complete-rise'
              style={enter(ROWS_AT + Math.min(i, ROW_CAP - 1) * ROW_STEP)}
            >
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
        <p className='small complete-sub complete-rise' style={enter(tail)}>
          Today&rsquo;s session was already counted — extra practice never hurts.
        </p>
      )}
      <Link
        to='/'
        className='btn complete-rise'
        style={{ marginTop: 22, ...enter(tail) }}
      >
        Back home
      </Link>
    </main>
  )
}
