import { useSearchParams } from 'react-router-dom'
import SessionComplete from '../components/session/SessionComplete'
import SessionEmpty from '../components/session/SessionEmpty'
import SessionErrorAlert from '../components/session/SessionErrorAlert'
import SessionHeader from '../components/session/SessionHeader'
import SessionSkeleton from '../components/session/SessionSkeleton'
import TileExercise from '../components/session/TileExercise'
import TypedExercise from '../components/session/TypedExercise'
import { useSessionRunner } from '../hooks/useSessionRunner'
import { cx } from '../lib/cx'

/**
 * The exercise runner's screen. `?practice=1` runs the separate drill instead:
 * one round of each slotted verse, counting toward nothing, for a day whose
 * path is already walked.
 */
export default function Session() {
  const [searchParams] = useSearchParams()
  const practice = searchParams.get('practice') === '1'
  const session = useSessionRunner(practice)

  const errorAlert = (
    <SessionErrorAlert error={session.error} onDismiss={session.clearError} />
  )

  if (session.phase === 'loading') {
    return (
      <>
        <SessionSkeleton />
        {errorAlert}
      </>
    )
  }

  if (session.phase === 'empty') return <SessionEmpty practice={practice} />

  if (session.phase === 'done' && session.completion) {
    return (
      <SessionComplete
        streak={session.completion.streak}
        recorded={session.completion.recorded}
        practice={practice}
        exercises={session.dayTotal}
        verses={session.dayVerses}
        correct={session.correctCount}
        events={session.events}
      />
    )
  }

  const wrapping = session.phase === 'wrapping'
  const Exercise =
    session.exercise.exerciseType === 'tile_fill_blank'
      ? TileExercise
      : TypedExercise

  return (
    // The last answer doesn't clear the screen: the session holds its shape and
    // recedes while the rail closes over it, so the recap arrives as the end of
    // something rather than after a gap.
    <main
      className={cx(
        'shell stack shell-full',
        wrapping && 'session-wrapping',
        session.leaving && 'session-leaving',
      )}
    >
      <SessionHeader
        done={session.done + (wrapping ? 1 : 0)}
        total={session.dayTotal}
      />

      <Exercise
        key={session.exerciseKey}
        exercise={session.exercise}
        fullText={session.fullText}
        translation={session.translation}
        isLast={session.isLast}
        pending={session.submitting}
        onComplete={(correct) => void session.submit(correct)}
      />

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
