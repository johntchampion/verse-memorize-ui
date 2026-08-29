import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/auth'
import { useApi } from '../hooks/useApi'

function timezoneOptions(current: string): string[] {
  const zones =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : []
  return zones.includes(current) ? zones : [current, ...zones]
}

function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  })
}

function usePreference(
  current: string,
  save: (value: string) => Promise<unknown>,
  onSaved: () => void,
  failureMessage: string,
) {
  const [pending, setPending] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const value = pending ?? current

  const choose = useCallback((next: string) => {
    setPending(next)
    setSaved(false)
  }, [])

  const submit = useCallback(async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await save(value)
      setSaved(true)
      setPending(null)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : failureMessage)
    } finally {
      setSaving(false)
    }
  }, [save, value, onSaved, failureMessage])

  return {
    value,
    choose,
    submit,
    saving,
    error,
    saved,
    dirty: value !== current,
  }
}

export default function Settings() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useApi(() => api.me())
  const catalog = useApi(() => api.translations())

  const currentTimezone = data?.user.timezone ?? 'UTC'
  const zones = useMemo(
    () => timezoneOptions(currentTimezone),
    [currentTimezone],
  )

  const timezone = usePreference(
    currentTimezone,
    (value) => api.updateProfile({ timezone: value }),
    refetch,
    'Could not save the timezone.',
  )

  const currentTranslation =
    data?.user.translation ?? catalog.data?.default ?? ''
  const translation = usePreference(
    currentTranslation,
    (value) => api.updateProfile({ translation: value }),
    refetch,
    'Could not save the translation.',
  )

  function signOut() {
    logout()
    navigate('/login', { replace: true })
  }

  if (loading) {
    return (
      <main className='shell'>
        <p className='muted'>Loading…</p>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className='shell stack'>
        <p className='error-text'>{error ?? 'Something went wrong.'}</p>
        <button className='btn-ghost' onClick={refetch}>
          Try again
        </button>
      </main>
    )
  }

  const selectedTranslation = catalog.data?.translations.find(
    (option) => option.code === translation.value,
  )

  return (
    <main className='shell stack'>
      <header className='screen-header' style={{ marginBottom: 0 }}>
        <Link to='/' className='icon-btn' aria-label='Back to home'>
          ←
        </Link>
        <h1>Settings</h1>
      </header>

      <section className='card' aria-label='Account'>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className='avatar' aria-hidden='true'>
            {data.user.email.charAt(0).toUpperCase()}
          </span>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: '0.95rem',
                overflowWrap: 'anywhere',
              }}
            >
              {data.user.email}
            </div>
            <div
              className='small muted'
              style={{ fontWeight: 700, fontSize: '0.78rem' }}
            >
              Member since {memberSince(data.user.createdAt)}
            </div>
          </div>
        </div>
        <div className='stat-tiles' style={{ marginTop: 14 }}>
          <div className='stat-tile'>
            <div className='stat-tile-big'>{data.sessionsCompleted}</div>
            <div className='stat-tile-label'>
              {data.sessionsCompleted === 1 ? 'session' : 'sessions'}
            </div>
          </div>
          <div className='stat-tile'>
            <div className='stat-tile-big'>{data.versesStarted}</div>
            <div className='stat-tile-label'>
              {data.versesStarted === 1 ? 'verse started' : 'verses started'}
            </div>
          </div>
          <div className='stat-tile'>
            <div className='stat-tile-big'>{data.streak}</div>
            <div className='stat-tile-label'>day streak</div>
          </div>
        </div>
      </section>

      <section className='card stack' aria-label='Translation'>
        <div>
          <p className='eyebrow'>Translation</p>
          <p className='small muted' style={{ fontWeight: 600, marginTop: 6 }}>
            The wording your verses are served in. Your progress carries over
            unchanged.
          </p>
        </div>

        {catalog.loading && <p className='muted'>Loading translations…</p>}

        {catalog.error && (
          <>
            <p className='error-text' role='alert'>
              {catalog.error}
            </p>
            <button className='btn-ghost' onClick={catalog.refetch}>
              Try again
            </button>
          </>
        )}

        {catalog.data && (
          <>
            <div className='field'>
              <label htmlFor='translation'>Translation</label>
              <select
                id='translation'
                value={translation.value}
                onChange={(e) => translation.choose(e.target.value)}
              >
                {catalog.data.translations.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
            {/* The licence of what's *selected*, not what's saved — so the
                terms are visible before committing to them. */}
            {selectedTranslation && (
              <p className='small muted' style={{ fontWeight: 600 }}>
                {selectedTranslation.license}
              </p>
            )}
            {translation.error && (
              <p className='error-text' role='alert'>
                {translation.error}
              </p>
            )}
            {translation.saved && (
              <p
                className='small'
                style={{ color: 'var(--green-text)', fontWeight: 800 }}
              >
                Saved.
              </p>
            )}
            <button
              className='btn'
              onClick={() => void translation.submit()}
              disabled={translation.saving || !translation.dirty}
            >
              {translation.saving ? 'Saving…' : 'Save translation'}
            </button>
          </>
        )}
      </section>

      <section className='card stack' aria-label='Timezone'>
        <div>
          <p className='eyebrow'>Timezone</p>
          <p className='small muted' style={{ fontWeight: 600, marginTop: 6 }}>
            Sets when your day rolls over — streaks and review due dates follow
            it.
          </p>
        </div>
        <div className='field'>
          <label htmlFor='timezone'>Timezone</label>
          <select
            id='timezone'
            value={timezone.value}
            onChange={(e) => timezone.choose(e.target.value)}
          >
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>
        {timezone.error && (
          <p className='error-text' role='alert'>
            {timezone.error}
          </p>
        )}
        {timezone.saved && (
          <p
            className='small'
            style={{ color: 'var(--green-text)', fontWeight: 800 }}
          >
            Saved.
          </p>
        )}
        <button
          className='btn'
          onClick={() => void timezone.submit()}
          disabled={timezone.saving || !timezone.dirty}
        >
          {timezone.saving ? 'Saving…' : 'Save timezone'}
        </button>
      </section>

      <button
        className='btn-ghost'
        onClick={signOut}
        style={{ color: 'var(--coral-text)' }}
      >
        Sign out
      </button>
    </main>
  )
}
