import { useNavigate } from 'react-router-dom'
import Alert from '../Alert'
import type { SessionError } from '../../hooks/useSessionRunner'

/** Portals over whatever the phase below renders, so a mid-session failure
    leaves the exercise (or skeleton) in view underneath. */
export default function SessionErrorAlert({
  error,
  onDismiss,
}: {
  error: SessionError | null
  onDismiss: () => void
}) {
  const navigate = useNavigate()
  return (
    <Alert
      open={error !== null}
      title='Something went wrong'
      message={error?.message ?? ''}
      tone='warning'
      primaryLabel='Try again'
      onPrimary={() => error?.retry()}
      secondaryLabel='Back to home'
      onSecondary={() => navigate('/')}
      onClose={onDismiss}
    />
  )
}
