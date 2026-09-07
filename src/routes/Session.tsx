import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import type { SessionExercise } from '../api/types'
import Alert from '../components/Alert'
import SessionComplete from '../components/session/SessionComplete'
import SessionHeader from '../components/session/SessionHeader'
import SessionSkeleton from '../components/session/SessionSkeleton'
import TileExercise from '../components/session/TileExercise'
import TypedExercise from '../components/session/TypedExercise'
import { hold } from '../lib/motion'
import { presentEvent, type SessionEvent } from '../lib/sessionEvents'
import { messageOf } from '../lib/errors'

type Phase = 'loading' | 'empty' | 'running' | 'wrapping' | 'done'

interface ErrorState {
  message: string
  retry: () => void
}

/**
 * How long the finished session stays on screen before the recap replaces it.
 * Long enough for the progress rail to close (320ms) and be seen closed, and
 * the recording round-trips run underneath it rather than after it — the pause
 * is what the wait was already costing, spent on something to look at.
 */
const WRAP_HOLD_MS = 520
const EXIT_MS = 160

/**
 * The exercise runner. Holds what's left of today's queue in local state and
 * steps through it one exercise at a time; only submitted answers round-trip
 * to the server. Answers are judged client-side against the full verse text,
 * fetched per verse up front.
 *
 * The day's plan lives on the server, and each exercise says whether it has
 * been answered — so leaving part-way through and coming back picks up at the
 * first one outstanding rather than starting the day over. The recap follows
 * the same rule: what the day moved, and what it added up to, come back from
 * the server rather than being accumulated here, so a session resumed after a
 * quit still reports the whole of it. `?practice=1` runs the separate drill
 * instead: one round of each slotted verse, counting toward nothing, for a day
 * whose path is already walked.
 */
export default function Session() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const practice = searchParams.get('practice') === '1'

  const [phase, setPhase] = useState<Phase>('loading')
  const [queue, setQueue] = useState<SessionExercise[]>([])
  /** Answered before this sitting — the progress rail counts the whole day. */
  const [alreadyDone, setAlreadyDone] = useState(0)
  const [dayTotal, setDayTotal] = useState(0)
  /** Distinct verses across the whole day, not just what's left of it. */
  const [dayVerses, setDayVerses] = useState(0)
  const [texts, setTexts] = useState<Record<string, string>>({})
  const [translation, setTranslation] = useState('')
  const [index, setIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<ErrorState | null>(null)
  const [events, setEvents] = useState<SessionEvent[]>([])
  const [correctCount, setCorrectCount] = useState(0)
  const [completion, setCompletion] = useState<{
    recorded: boolean
    streak: number | null
  } | null>(null)
  /** The last beat of the hold: the session fades before the recap arrives. */
  const [leaving, setLeaving] = useState(false)

  const loadTokenRef = useRef(0)

  const load = useCallback(async () => {
    const token = ++loadTokenRef.current
    setError(null)
    setPhase('loading')
    try {
      const today = await api.sessionToday(practice)
      const outstanding = today.exercises.filter((e) => !e.completed)
      if (outstanding.length === 0) {
        if (loadTokenRef.current !== token) return
        setPhase('empty')
        return
      }
      // Every queued verse is unlocked for this user, so its full text is
      // available — it's the answer key for both exercise types.
      const ids = [...new Set(outstanding.map((e) => e.verseId))]
      const details = await Promise.all(ids.map((id) => api.verse(id)))
      const byId: Record<string, string> = {}
      for (const detail of details) {
        if (!detail.verse.text) throw new Error('verse text unavailable')
        if (detail.translation !== today.translation) {
          throw new Error('Your translation changed — start the session again.')
        }
        byId[detail.verse.id] = detail.verse.text
      }
      // A superseded call (e.g. React StrictMode's double-invoke in dev, or a
      // practice drill re-requested before the first reply lands) must never
      // overwrite state a newer call already set — that's what let blankedText
      // from one response pair with wordBank from another.
      if (loadTokenRef.current !== token) return
      setQueue(outstanding)
      setAlreadyDone(today.completedCount)
      setDayTotal(today.count)
      setDayVerses(new Set(today.exercises.map((e) => e.verseId)).size)
      // Seeded from the server, so a session picked up again recaps everything
      // the day moved rather than only what happens from here on. A drill gets
      // nothing to seed: its recap is its own.
      setEvents(today.events.map(presentEvent))
      setCorrectCount(today.correctCount)
      setTexts(byId)
      setTranslation(today.translation)
      setIndex(0)
      setPhase('running')
    } catch (err) {
      if (loadTokenRef.current !== token) return
      setError({
        message: messageOf(err, 'Could not load today’s session.'),
        retry: () => void load(),
      })
    }
  }, [practice])

  useEffect(() => {
    void load()
  }, [load])

  const finish = useCallback(async () => {
    setError(null)
    setLeaving(false)
    setPhase('wrapping')
    try {
      const record = async () => {
        // A drill is extra work on top of a finished day: there is no session
        // to record and no refill for it to trigger.
        let recorded = false
        if (!practice) {
          const result = await api.sessionComplete()
          recorded = result.recorded
          if (result.events.length > 0) {
            setEvents((prev) => [...prev, ...result.events.map(presentEvent)])
          }
        }
        let streak: number | null = null
        try {
          streak = (await api.me()).streak
        } catch {
          // The session is already recorded; a failed streak fetch shouldn't
          // block the completion screen.
        }
        return { recorded, streak }
      }
      // The recording and the pause run together rather than in sequence, so a
      // fast network waits out the rail and a slow one is already covered.
      const [result] = await Promise.all([record(), hold(WRAP_HOLD_MS)])
      setCompletion(result)
      setLeaving(true)
      await hold(EXIT_MS)
      setPhase('done')
    } catch (err) {
      setLeaving(false)
      setError({
        message: messageOf(err, 'Could not record the session.'),
        retry: () => void finish(),
      })
    }
  }, [practice])

  // A function declaration (hoisted) so the retry closure can re-invoke it.
  async function submit(correct: boolean) {
    if (submitting) return
    setSubmitting(true)
    const exercise = queue[index]
    try {
      const outcome = await api.attempt(
        exercise.userVerseId,
        exercise.exerciseType,
        correct,
      )
      if (correct) setCorrectCount((n) => n + 1)
      // What this attempt moved, as the server recorded it — including any
      // slot its outcome refilled. Held for the recap rather than announced
      // here: a move mid-answer is a distraction, and the end of the session
      // is where the day's moves are read together. Nothing is derived from
      // `exercise.stage`: that was captured when the day loaded, and a verse
      // is drilled three times a day, so it goes stale the moment one of them
      // upgrades.
      if (outcome.events.length > 0) {
        setEvents((prev) => [...prev, ...outcome.events.map(presentEvent)])
      }
      if (index + 1 < queue.length) {
        setIndex(index + 1)
      } else {
        await finish()
      }
    } catch (err) {
      setError({
        message: messageOf(err, 'Could not save that answer.'),
        retry: () => {
          setError(null)
          void submit(correct)
        },
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Portals over whatever the phase below renders, so a mid-session failure
  // leaves the exercise (or skeleton, or "wrapping up") in view underneath.
  const errorAlert = (
    <Alert
      open={error !== null}
      title='Something went wrong'
      message={error?.message ?? ''}
      tone='warning'
      primaryLabel='Try again'
      onPrimary={() => error?.retry()}
      secondaryLabel='Back to home'
      onSecondary={() => navigate('/')}
      onClose={() => setError(null)}
    />
  )

  if (phase === 'loading') {
    return (
      <>
        <SessionSkeleton />
        {errorAlert}
      </>
    )
  }

  if (phase === 'empty') {
    return (
      <main className='shell stack'>
        <p className='eyebrow'>
          {practice ? 'Extra practice' : 'Today\u2019s session'}
        </p>
        <h1 style={{ fontFamily: 'var(--serif)' }}>All caught up</h1>
        <p className='muted'>
          {practice
            ? 'There are no verses in your practice slots to drill.'
            : 'Nothing is due right now. Come back tomorrow.'}
        </p>
        <Link to='/' className='btn-ghost'>
          Back to home
        </Link>
      </main>
    )
  }

  if (phase === 'done' && completion) {
    return (
      <SessionComplete
        streak={completion.streak}
        recorded={completion.recorded}
        practice={practice}
        exercises={dayTotal}
        verses={dayVerses}
        correct={correctCount}
        events={events}
      />
    )
  }

  const exercise = queue[index]
  const fullText = texts[exercise.verseId]
  const isLast = index === queue.length - 1
  const wrapping = phase === 'wrapping'

  // The last answer doesn't clear the screen: the session holds its shape and
  // recedes while the rail closes over it, so the recap arrives as the end of
  // something rather than after a gap.
  const shellClass = [
    'shell stack shell-full',
    wrapping ? 'session-wrapping' : '',
    leaving ? 'session-leaving' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <main className={shellClass}>
      <SessionHeader
        done={alreadyDone + index + (wrapping ? 1 : 0)}
        total={dayTotal}
      />

      {exercise.exerciseType === 'tile_fill_blank' ? (
        <TileExercise
          key={index}
          exercise={exercise}
          fullText={fullText}
          translation={translation}
          isLast={isLast}
          pending={submitting}
          onComplete={(correct) => void submit(correct)}
        />
      ) : (
        <TypedExercise
          key={index}
          exercise={exercise}
          fullText={fullText}
          translation={translation}
          isLast={isLast}
          pending={submitting}
          onComplete={(correct) => void submit(correct)}
        />
      )}

      {/* Only ever seen when the recording outlasts the hold: its delay is
          longer than the pause it would otherwise interrupt. */}
      {wrapping && (
        <p className='wrap-note' role='status'>
          Wrapping up…
        </p>
      )}
      {errorAlert}
    </main>
  )
}
