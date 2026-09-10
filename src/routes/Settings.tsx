import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import Screen, { BackLink } from '../components/Screen'
import AccountCard from '../components/settings/AccountCard'
import DeleteAccountAlert from '../components/settings/DeleteAccountAlert'
import PasswordCard from '../components/settings/PasswordCard'
import PreferenceCard from '../components/settings/PreferenceCard'
import ToggleCard from '../components/settings/ToggleCard'
import { useAuth } from '../context/auth'
import { useApi } from '../hooks/useApi'
import { usePreference } from '../hooks/usePreference'
import { usePushReminders } from '../hooks/usePushReminders'
import { timezoneOptions } from '../lib/timezones'

export default function Settings() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const me = useApi(() => api.me())
  const catalog = useApi(() => api.translations())

  const currentTimezone = me.data?.user.timezone ?? 'UTC'
  const zones = useMemo(
    () => timezoneOptions(currentTimezone),
    [currentTimezone],
  )
  const timezone = usePreference(
    currentTimezone,
    (value) => api.updateProfile({ timezone: value }),
    me.refetch,
    'Could not save the timezone.',
  )

  const currentTranslation =
    me.data?.user.translation ?? catalog.data?.default ?? ''
  const translation = usePreference(
    currentTranslation,
    (value) => api.updateProfile({ translation: value }),
    me.refetch,
    'Could not save the translation.',
  )

  const reminders = usePushReminders(me.data?.user.remindersEnabled, me.refetch)

  const [deleteOpen, setDeleteOpen] = useState(false)

  function signOut() {
    logout()
    navigate('/login', { replace: true })
  }

  function afterDelete() {
    logout()
    navigate('/signup', { replace: true })
  }

  return (
    <Screen
      layout='stack'
      leading={<BackLink to='/' label='Back to home' />}
      title={<h1>Settings</h1>}
      loading={me.pending}
      loadingLabel='Loading settings…'
      error={me.error}
      onRetry={me.refetch}
    >
      <AccountCard user={me.data?.user ?? null} />

      <PreferenceCard
        eyebrow='Translation'
        description='The wording your verses are served in. Your progress carries over unchanged.'
        label='Translation'
        id='translation'
        options={
          catalog.data?.translations
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((option) => ({
              value: option.code,
              label: option.name,
              note: option.license,
            })) ?? null
        }
        hasNote
        pref={translation}
        saveLabel='Save translation'
        loadError={catalog.error}
        onRetryLoad={catalog.refetch}
      />

      <PreferenceCard
        eyebrow='Timezone'
        description='Sets when your day rolls over — streaks and review due dates follow it.'
        label='Timezone'
        id='timezone'
        options={
          me.data ? zones.map((zone) => ({ value: zone, label: zone })) : null
        }
        pref={timezone}
        saveLabel='Save timezone'
      />

      <ToggleCard
        eyebrow='Daily reminder'
        description='A nudge to practise, half an hour after the time you usually start — and never later than 9pm.'
        checked={reminders.enabled}
        busy={reminders.busy}
        unavailable={reminders.unavailableMessage}
        hint={reminders.hint}
        error={reminders.error}
        onChange={reminders.toggle}
      >
        {reminders.state === 'needs-device' && (
          <button
            className='btn'
            disabled={reminders.busy}
            onClick={() => void reminders.enableThisDevice()}
          >
            Allow notifications on this device
          </button>
        )}
        {reminders.state === 'on' && (
          <button
            className='btn-ghost'
            onClick={() => void reminders.sendTest()}
          >
            Send a test notification
          </button>
        )}
      </ToggleCard>

      <PasswordCard />

      <button
        className='btn-ghost'
        onClick={signOut}
        style={{ color: 'var(--coral-text)' }}
      >
        Sign out
      </button>

      <button
        className='btn-ghost'
        onClick={() => setDeleteOpen(true)}
        style={{ color: 'var(--coral-text)' }}
      >
        Delete account
      </button>

      <DeleteAccountAlert
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={afterDelete}
      />
    </Screen>
  )
}
