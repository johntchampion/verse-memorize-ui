import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import type { SessionExercise } from '../api/types'
import { messageOf } from '../lib/errors'
import { hold } from '../lib/motion'
import { clearDailyReminder } from '../lib/push'
import { presentEvent, type SessionEvent } from '../lib/sessionEvents'

export type SessionPhase = 'loading' | 'empty' | 'running' | 'wrapping' | 'done'

export interface SessionError {
  message: string
  retry: () => void
}

/** Long enough for the progress rail to close (320ms) and be seen closed. */
const WRAP_HOLD_MS = 520
const EXIT_MS = 160

/**
 * The exercise runner. Answers are judged client-side against the full verse
 * text; only submissions round-trip. The day's plan and its recap both live on
 * the server, so a session resumed after a quit picks up where it left off and
 * still reports the whole day.
 */
export function useSessionRunner(practice: boolean) {
  const [phase, setPhase] = useState<SessionPhase>('loading')
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
  const [error, setError] = useState<SessionError | null>(null)
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
      // The full text is the answer key for both exercise types.
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
      // A superseded call must never overwrite newer state — that is what let
      // blankedText from one response pair with wordBank from another.
      if (loadTokenRef.current !== token) return
      setQueue(outstanding)
      setAlreadyDone(today.completedCount)
      setDayTotal(today.count)
      setDayVerses(new Set(today.exercises.map((e) => e.verseId)).size)
      // A drill gets nothing to seed: its recap is its own.
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
        // A drill has no session to record and no refill to trigger.
        let recorded = false
        if (!practice) {
          const result = await api.sessionComplete()
          recorded = result.recorded
          if (result.events.length > 0) {
            setEvents((prev) => [...prev, ...result.events.map(presentEvent)])
          }
          // A failure here can't be allowed to block the completion screen.
          void clearDailyReminder().catch(() => {})
        }
        let streak: number | null = null
        try {
          streak = (await api.me()).streak
        } catch {
          // Already recorded — don't block the completion screen on this.
        }
        return { recorded, streak }
      }
      // Together, not in sequence: a fast network waits out the rail and a
      // slow one is already covered.
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
      // Held for the recap, not announced mid-answer. Nothing is derived from
      // `exercise.stage`: it goes stale as soon as a repetition upgrades it.
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

  return {
    phase,
    exercise: queue[index],
    fullText: texts[queue[index]?.verseId],
    translation,
    isLast: index === queue.length - 1,
    submitting,
    submit,
    error,
    clearError: () => setError(null),
    done: alreadyDone + index,
    dayTotal,
    dayVerses,
    correctCount,
    events,
    completion,
    leaving,
    exerciseKey: index,
  }
}
