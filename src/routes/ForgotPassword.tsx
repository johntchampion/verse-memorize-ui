import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../components/Alert'
import AppIcon from '../components/AppIcon'
import { api } from '../api/client'
import { EMAIL_RE } from '../lib/email'
import { messageOf } from '../lib/errors'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await api.forgotPassword(email.trim())
      setSent(true)
    } catch (err) {
      setError(messageOf(err, 'Could not send the reset email'))
      setSubmitting(false)
    }
  }

  return (
    <main className='auth-shell'>
      <div className='auth-logo'>
        <AppIcon />
      </div>
      <h1 className='auth-title'>
        {sent ? 'Check your inbox.' : 'Forgotten password?'}
      </h1>

      {sent ? (
        <>
          <p className='muted' style={{ fontWeight: 600, marginBottom: 26 }}>
            If <strong>{email.trim()}</strong> has an account, a link to set a
            new password is on its way. It expires in 30 minutes.
          </p>
          <Link className='btn' to='/login'>
            Back to sign in
          </Link>
          <p className='small muted' style={{ fontWeight: 700, marginTop: 20 }}>
            Nothing arrived?{' '}
            <button
              className='link-btn'
              onClick={() => {
                setSent(false)
                setSubmitting(false)
              }}
            >
              Try another address
            </button>
          </p>
        </>
      ) : (
        <>
          <p className='muted' style={{ fontWeight: 600, marginBottom: 26 }}>
            Enter the address you signed up with and you&rsquo;ll be emailed a
            link to set a new password.
          </p>
          <form className='stack' onSubmit={onSubmit} noValidate>
            <div className='field'>
              <label htmlFor='email'>Email</label>
              <input
                id='email'
                type='email'
                autoComplete='email'
                placeholder='you@example.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button className='btn' type='submit' disabled={submitting}>
              {submitting ? 'Sending…' : 'Email me a link'}
            </button>
          </form>
          <p className='small muted' style={{ fontWeight: 700, marginTop: 20 }}>
            Remembered it? <Link to='/login'>Sign in</Link>
          </p>
        </>
      )}

      <Alert
        open={error !== null}
        title='Couldn&rsquo;t send that'
        message={error ?? ''}
        primaryLabel='OK'
        onPrimary={() => setError(null)}
        onClose={() => setError(null)}
      />
    </main>
  )
}
