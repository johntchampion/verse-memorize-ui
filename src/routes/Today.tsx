import { api } from '../api/client'
import Screen from '../components/Screen'
import SettingsLink from '../components/today/SettingsLink'
import StreakHero from '../components/today/StreakHero'
import TodayCta from '../components/today/TodayCta'
import { combineApi, useApi } from '../hooks/useApi'

/**
 * The Today tab: one big streak circle and one big button. Everything else
 * lives on the other tabs.
 */
export default function Today() {
  const me = useApi(() => api.me())
  const session = useApi(() => api.sessionToday())
  const both = combineApi(me, session)

  return (
    <Screen
      layout='tabbed'
      className='today-shell'
      leading={<span className='wordmark'>Verse Memorize</span>}
      trailing={<SettingsLink />}
      loading={both.pending}
      loadingLabel='Loading today’s practice…'
      error={both.error}
      onRetry={both.refetch}
      errorClassName='today-hero stack'
      errorStyle={{ justifyContent: 'center' }}
    >
      <div className='today-hero'>
        <StreakHero profile={me.data} session={session.data} />
        <div>
          <TodayCta session={session.data} />
          <p className='today-aside'>Daily practice is how verses stick.</p>
        </div>
      </div>
    </Screen>
  )
}
