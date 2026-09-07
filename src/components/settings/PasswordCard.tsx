import { useState } from 'react'
import { api } from '../../api/client'
import { messageOf } from '../../lib/errors'

/**
 * Changing a password is a reset like any other, so this only asks for the
 * email to be sent — nothing is typed here, and the address is the one already
 * on the account. Proving control of the mailbox is what a reset is for, and it
 * is the same proof whether or not the old password is to hand.
 */
export default function PasswordCard() {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    setError(null)
    setSending(true)
    try {
      await api.requestPasswordReset()
      setSent(true)
    } catch (err) {
      setError(messageOf(err, 'Could not send the reset email.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <section className='card stack' aria-label='Password'>
      <div>
        <p className='eyebrow'>Change Password</p>
        <p className='small muted' style={{ fontWeight: 600, marginTop: 6 }}>
          You&rsquo;ll be emailed a link to set a new password. Resetting your
          password signs you out on every other device.
        </p>
      </div>

      {error && (
        <p className='error-text' role='alert'>
          {error}
        </p>
      )}

      {/* Nothing on the card changes when this works, so the confirmation has
          to say so itself. */}
      {sent && (
        <p
          className='small'
          style={{ color: 'var(--green-text)', fontWeight: 800 }}
        >
          Sent. The link expires in 30 minutes.
        </p>
      )}

      <button
        className='btn-ghost'
        onClick={() => void send()}
        disabled={sending}
      >
        {sending ? 'Sending…' : sent ? 'Send another link' : 'Email me a link'}
      </button>
    </section>
  )
}
