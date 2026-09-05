import { api } from '../api/client'
import Screen from '../components/Screen'
import { Skeleton } from '../components/Skeleton'
import PathCta from '../components/today/PathCta'
import PathList from '../components/today/PathList'
import SettingsLink from '../components/today/SettingsLink'
import { combineApi, useApi } from '../hooks/useApi'
import { buildPath, minutesLabel, type Path } from '../lib/path'

/** What the day is asking for, and how far into it you are. */
function heading(path: Path): { head: string; sub: string } {
  if (path.total === 0) {
    return {
      head: 'All caught up',
      sub: 'Nothing due today. Come back tomorrow.',
    }
  }

  // What the day is made of, naming only the halves it actually has: a day
  // with nothing due back shouldn't advertise the zero.
  const parts: string[] = []
  if (path.reviewCount > 0) parts.push(`${path.reviewCount} for review`)
  if (path.roundCount > 0) {
    parts.push(
      `${path.roundCount} practice ${path.roundCount === 1 ? 'round' : 'rounds'}`,
    )
  }
  const shape = parts.join(' · ')

  if (path.complete) {
    return {
      head: 'Today’s path is done',
      sub: `${path.total} of ${path.total} done · ${shape}`,
    }
  }
  if (path.done > 0) {
    return {
      head: 'Pick up where you left off',
      sub: `${path.done} of ${path.total} done · ${path.total - path.done} left · ${minutesLabel(path.secondsLeft)}`,
    }
  }
  return {
    head: 'Today’s path',
    sub: `0 of ${path.total} done · ${shape} · ${minutesLabel(path.secondsLeft)}`,
  }
}

/**
 * The Today tab: the day laid out as a path, one stop per exercise. The stops
 * behind you are spent and the ones ahead are locked — the only way in is the
 * live stop, which is also where the button at the bottom leads.
 */
export default function Today() {
  const me = useApi(() => api.me())
  const session = useApi(() => api.sessionToday())
  const both = combineApi(me, session)

  const path = session.data ? buildPath(session.data.exercises) : null
  const copy = path ? heading(path) : null

  return (
    <Screen
      layout='tabbed'
      className='today-shell'
      leading={<span className='wordmark'>Verse Memorize</span>}
      trailing={
        <>
          {/* Shown at zero too. It is the badge for the streak you are keeping,
              and a day without one is exactly when saying so is worth most. */}
          {me.data && (
            <span className='chip chip-streak streak-badge'>
              {me.data.streak} day streak
            </span>
          )}
          <SettingsLink />
        </>
      }
      loading={both.pending}
      loadingLabel='Loading today’s path…'
      error={both.error}
      onRetry={both.refetch}
    >
      <div className={path?.total === 0 ? 'path-intro path-intro-alone' : 'path-intro'}>
        <h1 className='path-head'>
          {copy?.head ?? <Skeleton variant='text' w='62%' />}
        </h1>
        <p className='path-sub'>
          {copy?.sub ?? <Skeleton variant='text' w='84%' />}
        </p>
      </div>

      <PathList nodes={path?.nodes ?? null} complete={path?.complete ?? false} />

      {/* Nothing due and nothing slotted leaves no button to dock. */}
      {(!path || path.total > 0) && (
        <div className='path-dock'>
          <PathCta path={path} />
        </div>
      )}
    </Screen>
  )
}
