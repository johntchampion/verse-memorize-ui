import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Alert from '../components/Alert'
import AppIcon from '../components/AppIcon'
import { useAuth } from '../context/auth'
import { messageOf } from '../lib/errors'

export default function ResetPassword() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  // Read once, then dropped from the URL below: a spent token has no business
  // sitting in history, in a referrer, or in a back-button resubmit.
  const [token] = useState(() => params.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Replace just the history without navigating or altering any other state.
    if (token) window.history.replaceState(null, '', '/reset-password')
  }, [token])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.')
      return
    }
    if (password !== confirm) {
      setError("Those two passwords don't match.")
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await resetPassword(token, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(messageOf(err, 'Could not set your new password'))
      setSubmitting(false)
    }
  }

  // A link that arrived mangled, or the page opened directly. Said up front
  // rather than after they have typed a password twice.
  if (!token) {
    return (
      <main className='auth-shell'>
        <div className='auth-logo'>
          <AppIcon />
        </div>
        <h1 className='auth-title'>That link looks incomplete.</h1>
        <p className='muted' style={{ fontWeight: 600, marginBottom: 26 }}>
          It may have been cut short by your email app. Ask for a fresh one and
          open it straight from the message.
        </p>
        <Link className='btn' to='/forgot-password'>
          Send a new link
        </Link>
      </main>
    )
  }

  return (
    <main className='auth-shell'>
      <div className='auth-logo'>
        <AppIcon />
      </div>
      <h1 className='auth-title'>Set a new password.</h1>
      <p className='muted' style={{ fontWeight: 600, marginBottom: 26 }}>
        Choosing a new one signs you out everywhere else.
      </p>
      <form className='stack' onSubmit={onSubmit} noValidate>
        <div className='field'>
          <label htmlFor='password'>New password</label>
          <input
            id='password'
            type='password'
            autoComplete='new-password'
            placeholder='At least 8 characters'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className='field'>
          <label htmlFor='confirm'>Confirm password</label>
          <input
            id='confirm'
            type='password'
            autoComplete='new-password'
            placeholder='Type it again'
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <button className='btn' type='submit' disabled={submitting}>
          {submitting ? 'Saving…' : 'Set password'}
        </button>
      </form>
      <p className='small muted' style={{ fontWeight: 700, marginTop: 20 }}>
        Link expired? <Link to='/forgot-password'>Send a new one</Link>
      </p>
      <Alert
        open={error !== null}
        title='Couldn&rsquo;t set your password'
        message={error ?? ''}
        primaryLabel='OK'
        onPrimary={() => setError(null)}
        onClose={() => setError(null)}
      />
    </main>
  )
}
