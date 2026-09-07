import { useState } from 'react'
import { ApiError, api } from '../../api/client'
import Alert from '../Alert'

/**
 * Permanent account deletion, re-confirmed with the password since it can't be
 * undone. The API's 401 here is a wrong password, not a dead session, so it
 * surfaces in the alert rather than logging the user out.
 */
export default function DeleteAccountAlert({
  open,
  onClose,
  onDeleted,
}: {
  open: boolean
  onClose: () => void
  onDeleted: () => void
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Cleared as it opens rather than as it closes, so a rejected password
  // doesn't flicker away underneath the exit animation.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setPassword('')
      setError(null)
    }
  }

  function close() {
    if (deleting) return
    onClose()
  }

  async function deleteAccount() {
    if (deleting) return
    if (!password) {
      setError('Enter your password to confirm.')
      return
    }
    setDeleting(true)
    setError(null)
    try {
      await api.deleteAccount(password)
      onDeleted()
    } catch (err) {
      setDeleting(false)
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    }
  }

  return (
    <Alert
      open={open}
      title='Delete account?'
      message={
        <>
          This permanently erases your account, verses, and progress — it can't
          be undone.
          <span className='field' style={{ marginTop: 16 }}>
            <input
              id='delete-password'
              type='password'
              autoComplete='current-password'
              placeholder='Your password'
              value={password}
              disabled={deleting}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void deleteAccount()
              }}
            />
          </span>
          {error && (
            <span
              className='error-text'
              role='alert'
              style={{ marginTop: 8, display: 'block' }}
            >
              {error}
            </span>
          )}
        </>
      }
      tone='danger'
      primaryLabel={deleting ? 'Deleting…' : 'Delete account'}
      onPrimary={() => void deleteAccount()}
      secondaryLabel='Cancel'
      onSecondary={close}
      onClose={close}
      dismissible={!deleting}
    />
  )
}
