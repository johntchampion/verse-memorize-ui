import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/auth'
import { EMAIL_RE } from '../../lib/email'
import { messageOf } from '../../lib/errors'
import { timezoneOptions } from '../../lib/timezones'

/** Signup with the progress the taster earned. */
export default function SignupStep({ onSignIn }: { onSignIn: () => void }) {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const browserTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  )
  const [timezone, setTimezone] = useState(browserTimezone)
  const zones = useMemo(
    () => timezoneOptions(browserTimezone),
    [browserTimezone],
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await signup(email.trim(), password, timezone)
      navigate('/', { replace: true })
    } catch (err) {
      setError(messageOf(err, 'Sign-up failed'))
      setSubmitting(false)
    }
  }

  return (
    <main className='auth-shell onboard-step'>
      <form
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        onSubmit={onSubmit}
        noValidate
      >
        <div className='stack onboard-center'>
          <div>
            <h1 className='auth-title'>
              Create an account
              <br />
              to start.
            </h1>
            <p className='muted' style={{ fontWeight: 600 }}>
              Your progress will be stored, and each session will be curated
              just for you.
            </p>
          </div>
          <div className='field'>
            <label htmlFor='onboard-email'>Email</label>
            <input
              id='onboard-email'
              type='email'
              autoComplete='email'
              placeholder='you@example.com'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className='field'>
            <label htmlFor='onboard-password'>Password</label>
            <input
              id='onboard-password'
              type='password'
              autoComplete='new-password'
              placeholder='At least 8 characters'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className='field'>
            <label htmlFor='onboard-timezone'>Timezone</label>
            <select
              id='onboard-timezone'
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
            <span className='small muted'>
              So your day rolls over at the right midnight.
            </span>
          </div>
          {error && (
            <p className='error-text' role='alert'>
              {error}
            </p>
          )}
        </div>
        <div style={{ marginTop: 16 }}>
          <p
            className='small muted'
            style={{ fontWeight: 700, textAlign: 'center' }}
          >
            Already have an account?{' '}
            <button type='button' className='link-btn' onClick={onSignIn}>
              Sign in
            </button>
          </p>
          <button
            className='btn'
            type='submit'
            disabled={submitting}
            style={{ marginTop: 14 }}
          >
            {submitting ? 'Creating account…' : 'Start memorizing'}
          </button>
        </div>
      </form>
    </main>
  )
}
