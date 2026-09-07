import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AhaStep from './AhaStep'
import HookStep from './HookStep'
import SignupStep from './SignupStep'
import TasterStep from './TasterStep'

type Step = 'hook' | 'taster' | 'aha' | 'signup'

/**
 * First-run cold open: no pitch, one verse, straight in. A hook screen, a live
 * taster, the explainer, then a signup you've earned.
 */
export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('hook')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])

  const toSignIn = () => navigate('/login')

  switch (step) {
    case 'taster':
      return <TasterStep onDone={() => setStep('aha')} />
    case 'aha':
      return <AhaStep onContinue={() => setStep('signup')} />
    case 'signup':
      return <SignupStep onSignIn={toSignIn} />
    default:
      return <HookStep onTry={() => setStep('taster')} onSignIn={toSignIn} />
  }
}
