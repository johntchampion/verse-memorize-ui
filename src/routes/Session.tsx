import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { SessionExercise, Stage } from '../api/types'
import ProgressBar from '../components/ProgressBar'
import TileExercise from '../components/TileExercise'
import TypedExercise from '../components/TypedExercise'
import { STAGE_LABELS, stageChangeMessage } from '../lib/exercise'

type Phase = 'loading' | 'empty' | 'running' | 'finishing' | 'done'

interface ErrorState {
  message: string
  retry: () => void
}

/** A moment worth celebrating on the completion screen. */
interface SessionEvent {
  icon: string
  iconBg: string
  title: string
  detail: string
  detailColor: string
}

const TOAST_MS = 2500

/** Stage transitions that read as wins on the completion screen. */
function celebrationEvent(
  reference: string,
  from: Stage,
  to: Stage,
): SessionEvent | null {
  if (from === to) return null
  if (to === 'learning_medium' || to === 'learning_heavy') {
    return {
      icon: '↑',
      iconBg: 'var(--coral-wash)',
      title: reference,
      detail: `${STAGE_LABELS[from]} → ${STAGE_LABELS[to]}`,
      detailColor: 'var(--coral-text)',
    }
  }
  if (to === 'review' && from !== 'decayed') {
    return {
      icon: '✓',
      iconBg: 'var(--green-wash)',
      title: reference,
      detail: 'Graduated — now in review',
      detailColor: 'var(--green-text)',
    }
  }
  if (to === 'mastered') {
    return {
      icon: '✓',
      iconBg: 'var(--green-wash)',
      title: reference,
      detail: 'Mastered — well kept',
      detailColor: 'var(--green-text)',
    }
  }
  return null
}

/**
 * The exercise runner. Holds today's queue in local state and steps through
 * it one exercise at a time; only submitted answers round-trip
 * to the server. Answers are judged client-side against the full verse text,
 * fetched per verse up front.
 */
export default function Session() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [queue, setQueue] = useState<SessionExercise[]>([])
  const [texts, setTexts] = useState<Record<string, string>>({})
  const [index, setIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<ErrorState | null>(null)
  const [events, setEvents] = useState<SessionEvent[]>([])
  const [correctCount, setCorrectCount] = useState(0)
  const [completion, setCompletion] = useState<{
    recorded: boolean
    streak: number | null
  } | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setPhase('loading')
    try {
      const today = await api.sessionToday()
      if (today.exercises.length === 0) {
        setPhase('empty')
        return
      }
      // Every queued verse is unlocked for this user, so its full text is
      // available — it's the answer key for both exercise types.
      const ids = [...new Set(today.exercises.map((e) => e.verseId))]
      const details = await Promise.all(ids.map((id) => api.verse(id)))
      const byId: Record<string, string> = {}
      for (const detail of details) {
        if (!detail.verse.text) throw new Error('verse text unavailable')
        byId[detail.verse.id] = detail.verse.text
      }
      setQueue(today.exercises)
      setTexts(byId)
      setIndex(0)
      setPhase('running')
    } catch (err) {
      setError({
        message:
          err instanceof Error
            ? err.message
            : 'Could not load today’s session.',
        retry: () => void load(),
      })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast])

  const finish = useCallback(async () => {
    setError(null)
    setPhase('finishing')
    try {
      const result = await api.sessionComplete()
      if (result.slotsFilled.length > 0) {
        setEvents((prev) => [
          ...prev,
          ...result.slotsFilled.map((uv) => ({
            icon: '🔓',
            iconBg: 'var(--amber-wash)',
            title:
              uv.slot !== null
                ? `Slot ${uv.slot} unlocked`
                : 'New verse unlocked',
            detail: 'A new verse joins your practice',
            detailColor: 'var(--amber-soft)',
          })),
        ])
      }
      let streak: number | null = null
      try {
        streak = (await api.me()).streak
      } catch {
        // The session is already recorded; a failed streak fetch shouldn't
        // block the completion screen.
      }
      setCompletion({ recorded: result.recorded, streak })
      setPhase('done')
    } catch (err) {
      setError({
        message:
          err instanceof Error ? err.message : 'Could not record the session.',
        retry: () => void finish(),
      })
    }
  }, [])

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
      const message = stageChangeMessage(
        exercise.stage,
        outcome.userVerse.stage,
      )
      if (message) setToast(message)
      const event = celebrationEvent(
        exercise.reference,
        exercise.stage,
        outcome.userVerse.stage,
      )
      if (event) setEvents((prev) => [...prev, event])
      if (index + 1 < queue.length) {
        setIndex(index + 1)
      } else {
        await finish()
      }
    } catch (err) {
      setError({
        message:
          err instanceof Error ? err.message : 'Could not save that answer.',
        retry: () => {
          setError(null)
          void submit(correct)
        },
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (error) {
    return (
      <main className='shell stack'>
        <p className='error-text' role='alert'>
          {error.message}
        </p>
        <button className='btn' onClick={error.retry}>
          Try again
        </button>
        <Link to='/' className='btn-ghost'>
          Back to home
        </Link>
      </main>
    )
  }

  if (phase === 'loading' || phase === 'finishing') {
    return (
      <main className='shell'>
        <p className='muted'>
          {phase === 'loading' ? 'Preparing today’s session…' : 'Wrapping up…'}
        </p>
      </main>
    )
  }

  if (phase === 'empty') {
    return (
      <main className='shell stack'>
        <p className='eyebrow'>Today&rsquo;s session</p>
        <h1 style={{ fontFamily: 'var(--serif)' }}>All caught up</h1>
        <p className='muted'>Nothing is due right now. Come back tomorrow.</p>
        <Link to='/' className='btn-ghost'>
          Back to home
        </Link>
      </main>
    )
  }

  if (phase === 'done' && completion) {
    const verseCount = new Set(queue.map((e) => e.verseId)).size
    const cleanNote =
      correctCount === queue.length
        ? 'a clean sweep'
        : correctCount > 0
          ? `zero misses on ${correctCount} of them`
          : 'every miss still teaches'
    return (
      <main className='complete-screen'>
        {completion.streak !== null && (
          <>
            <div className='complete-circle'>
              <span className='complete-circle-count'>{completion.streak}</span>
            </div>
            <div className='complete-eyebrow'>Day streak</div>
          </>
        )}
        <h1 className='complete-title'>Kept the day.</h1>
        <p className='complete-sub'>
          {queue.length} {queue.length === 1 ? 'exercise' : 'exercises'} ·{' '}
          {verseCount} {verseCount === 1 ? 'verse' : 'verses'} · {cleanNote}
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

        {!completion.recorded && (
          <p className='small complete-sub'>
            Today&rsquo;s session was already counted — extra practice never
            hurts.
          </p>
        )}
        <Link to='/' className='btn' style={{ marginTop: 22 }}>
          Back home
        </Link>
      </main>
    )
  }

  const exercise = queue[index]
  const fullText = texts[exercise.verseId]

  return (
    <main className='shell stack shell-full'>
      {toast && (
        <div className='toast' role='status'>
          {toast}
        </div>
      )}

      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to='/' className='icon-btn' aria-label='Exit session'>
          ✕
        </Link>
        <div style={{ flex: 1 }}>
          <ProgressBar done={index} total={queue.length} />
        </div>
        <span className='progress-count'>
          {index + 1}/{queue.length}
        </span>
      </header>

      {exercise.exerciseType === 'tile_fill_blank' ? (
        <TileExercise
          key={index}
          exercise={exercise}
          fullText={fullText}
          onComplete={(correct) => void submit(correct)}
        />
      ) : (
        <TypedExercise
          key={index}
          exercise={exercise}
          fullText={fullText}
          onComplete={(correct) => void submit(correct)}
        />
      )}
    </main>
  )
}
