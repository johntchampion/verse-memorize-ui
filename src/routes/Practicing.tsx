import { Link } from 'react-router-dom'
import { api } from '../api/client'
import SlotRow from '../components/SlotRow'
import TabBar from '../components/TabBar'
import { useApi } from '../hooks/useApi'
import { todayInTimezone } from '../lib/dates'

/**
 * The Practicing tab: the learning slots, plus what's coming back for review
 * in today's session.
 */
export default function Practicing() {
  const me = useApi(() => api.me())
  // Verse texts feed the slot-card snippets; the review-due card comes from
  // today's session. The screen renders without either if a fetch fails.
  const verses = useApi(() => api.verses())
  const session = useApi(() => api.sessionToday())

  if (me.loading || verses.loading || session.loading) {
    return (
      <>
        <main className='shell shell-tabbed'>
          <p className='muted'>Loading…</p>
        </main>
        <TabBar />
      </>
    )
  }

  if (me.error || !me.data) {
    return (
      <>
        <main className='shell shell-tabbed stack'>
          <p className='error-text'>{me.error ?? 'Something went wrong.'}</p>
          <button
            className='btn-ghost'
            onClick={() => {
              me.refetch()
              verses.refetch()
              session.refetch()
            }}
          >
            Try again
          </button>
        </main>
        <TabBar />
      </>
    )
  }

  const { slots } = me.data
  const textById = new Map(verses.data?.verses.map((v) => [v.id, v.text]) ?? [])
  const dueCount = session.data
    ? new Set(
        session.data.exercises
          .filter((e) => e.queue === 'review')
          .map((e) => e.verseId),
      ).size
    : 0
  // Day boundaries follow the profile's timezone, not the device's.
  const today = todayInTimezone(me.data.user.timezone)
  // Verses pulled out of review for repeated misses. They have no due date and
  // sit out of the session entirely until a slot opens up for them.
  const relearning = verses.data?.verses.filter((v) => v.needsRelearning) ?? []

  return (
    <>
      <main className='shell shell-tabbed'>
        <h1 className='view-title'>In Practice</h1>
        <p className='view-sub'>
          Three at a time. A verse graduates from In Practice once it&rsquo;s
          practiced correctly three times in a row for three days.
        </p>

        <section
          className='stack'
          style={{ gap: 12, marginTop: 20 }}
          aria-label='Learning slots'
        >
          {Array.from({ length: slots.max }, (_, i) => {
            const slot = i + 1
            const verse = slots.active.find((v) => v.slot === slot) ?? null
            return (
              <SlotRow
                key={slot}
                slot={slot}
                verse={verse}
                unlocked={slots.unlocked}
                snippet={verse ? (textById.get(verse.verseId) ?? null) : null}
                today={today}
              />
            )
          })}
        </section>

        {dueCount > 0 && (
          <div className='due-card'>
            <div className='eyebrow' style={{ color: 'var(--amber-soft)' }}>
              Coming back today
            </div>
            <div className='due-row'>
              <span className='due-count'>{dueCount}</span>
              <span className='due-what'>
                memorized {dueCount === 1 ? 'verse' : 'verses'} due for full recall
              </span>
            </div>
            <p className='due-copy'>
              They return right when you&rsquo;d start to forget. Included in
              today&rsquo;s session.
            </p>
          </div>
        )}

        {relearning.length > 0 && (
          <div className='relearn-card'>
            <div className='eyebrow' style={{ color: 'var(--coral-text)' }}>
              Waiting for a slot
            </div>
            <p className='relearn-copy'>
              {relearning.length === 1 ? 'This one' : 'These'} slipped in review
              and {relearning.length === 1 ? 'comes' : 'come'} back to practice
              once a slot frees up — that happens when another verse graduates.
            </p>
            <ul className='relearn-list'>
              {relearning.map((verse) => (
                <li key={verse.id}>
                  <Link to={`/verses/${verse.id}`} className='relearn-ref'>
                    {verse.reference}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
      <TabBar />
    </>
  )
}
