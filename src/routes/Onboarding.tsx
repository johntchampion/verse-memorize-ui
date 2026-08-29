import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'
import StageLadder from '../components/StageLadder'
import { useAuth } from '../context/auth'

/**
 * First-run cold open: no pitch, one verse, straight in. A hook screen, a
 * live taster tile exercise, the "aha" explainer, then a signup you've
 * earned. The taster is demonstration only — it runs entirely in local
 * state, never touches the API, and counts toward nothing (no streak, no
 * attempt history).
 */

type Step = 'hook' | 'taster' | 'aha' | 'signup'

interface TasterPart {
  word: string
  blank?: boolean
  /** Punctuation trailing the word, rendered outside an unfilled blank. */
  after?: string
}

const TASTER_REFERENCE = 'Psalm 23:1'
const TASTER_PARTS: TasterPart[] = [
  { word: 'The' },
  { word: 'Lord' },
  { word: 'is' },
  { word: 'my' },
  { word: 'shepherd', blank: true, after: ',' },
  { word: 'I' },
  { word: 'lack' },
  { word: 'nothing', blank: true, after: '.' },
]
const TASTER_BANK = ['nothing', 'shepherd', 'peace', 'Lord']
const TASTER_ANSWERS = TASTER_PARTS.filter((p) => p.blank).map((p) => p.word)

/** Each part paired with its position among the blanks (null for plain text). */
let blankCounter = 0
const INDEXED_PARTS = TASTER_PARTS.map((part) => ({
  part,
  blankIndex: part.blank ? blankCounter++ : null,
}))

const WRONG_FLASH_MS = 400

/** The Psalm 23:1 card, shared by the hook (all blanks open) and the taster. */
function TasterVerse({
  filled,
  showCurrent,
}: {
  filled: number
  showCurrent: boolean
}) {
  return (
    <div className='verse-card'>
      <p className='verse-ref'>{TASTER_REFERENCE}</p>
      <p className='verse-text'>
        {INDEXED_PARTS.map(({ part, blankIndex }, i) => {
          const space = i > 0 ? ' ' : ''
          if (blankIndex === null) {
            return (
              <span key={i}>
                {space}
                {part.word}
                {part.after}
              </span>
            )
          }
          if (blankIndex < filled) {
            return (
              <span key={i}>
                {space}
                <span className='blank-filled'>
                  {part.word}
                  {part.after}
                </span>
              </span>
            )
          }
          const current = showCurrent && blankIndex === filled
          return (
            <span key={i} style={{ whiteSpace: 'nowrap' }}>
              {space}
              <span
                className={current ? 'blank blank-current' : 'blank'}
                aria-label='blank'
              >
                {part.word}
              </span>
              {part.after}
            </span>
          )
        })}
      </p>
    </div>
  )
}

/** Screen 2: the live taster — tap the two missing words. */
function TasterStep({ onDone }: { onDone: () => void }) {
  const [filled, setFilled] = useState(0)
  const [used, setUsed] = useState<ReadonlySet<number>>(new Set())
  const [wrongTile, setWrongTile] = useState<number | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  const done = filled >= TASTER_ANSWERS.length

  function tapTile(i: number, word: string) {
    if (done || used.has(i)) return
    if (word.toLowerCase() === TASTER_ANSWERS[filled].toLowerCase()) {
      setUsed((prev) => new Set(prev).add(i))
      setWrongTile(null)
      setFilled((n) => n + 1)
    } else {
      setWrongTile(i)
      timers.current.push(setTimeout(() => setWrongTile(null), WRONG_FLASH_MS))
    }
  }

  return (
    <main
      className='shell stack shell-full'
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <ProgressBar done={filled} total={TASTER_ANSWERS.length} />
        </div>
        <span className='progress-count'>
          {filled}/{TASTER_ANSWERS.length}
        </span>
      </header>

      <div>
        <h2 className='onboard-taster-heading'>Fill in the missing words</h2>
        <p className='small muted' style={{ fontWeight: 600, marginTop: 4 }}>
          Two words are hiding. You have the whole word bank below.
        </p>
      </div>

      <TasterVerse filled={filled} showCurrent />

      <div className='word-bank' role='group' aria-label='Word bank'>
        {TASTER_BANK.map((word, i) => {
          const isUsed = used.has(i)
          const className = [
            'tile',
            isUsed ? 'tile-used' : wrongTile === i ? 'tile-wrong' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={i}
              type='button'
              className={className}
              disabled={isUsed || done}
              onClick={() => tapTile(i, word)}
            >
              {word}
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <button
          className='btn'
          style={{ marginTop: 12 }}
          disabled={!done}
          onClick={onDone}
        >
          {done ? 'See what happens next →' : 'Fill both blanks to continue'}
        </button>
      </div>
    </main>
  )
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function timezoneOptions(current: string): string[] {
  const zones =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : []
  return zones.includes(current) ? zones : [current, ...zones]
}

/** Screen 4: signup with earned progress. */
function SignupStep({ onSignIn }: { onSignIn: () => void }) {
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
      setError(err instanceof Error ? err.message : 'Sign-up failed')
      setSubmitting(false)
    }
  }

  return (
    <main className='auth-shell'>
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
              to start a streak.
            </h1>
            <p className='muted' style={{ fontWeight: 600 }}>
              Start your streak today, and verse one of the hundred is ready.
              Each returns right when you&rsquo;d start to forget it.
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
            {submitting ? 'Creating account…' : 'Start my streak'}
          </button>
        </div>
      </form>
    </main>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('hook')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])

  function toSignIn() {
    navigate('/login')
  }

  if (step === 'taster') return <TasterStep onDone={() => setStep('aha')} />

  if (step === 'aha') {
    return (
      <main className='complete-screen'>
        <div className='onboard-center' style={{ alignItems: 'center' }}>
          <div className='onboard-check' aria-hidden='true'>
            <span>✓</span>
          </div>
          <h1 className='complete-title'>
            That&rsquo;s one verse
            <br />
            on its way in.
          </h1>
          <p className='complete-sub' style={{ textWrap: 'pretty' }}>
            That was one verse. Walk through 100 of them so that at the end you
            can recite core Christian doctrine.
          </p>

          <div className='onboard-how'>
            <p className='eyebrow' style={{ color: 'var(--amber-soft)' }}>
              How each verse goes in
            </p>
            <StageLadder stage='learning_light' />
            <p
              className='small muted'
              style={{ fontWeight: 600, marginTop: 12, lineHeight: 1.45 }}
            >
              Three right in a row moves a verse up and the blanks grow. Past
              heavy it&rsquo;s memorized, and comes back on a widening schedule so it
              stays. Three verses at a time — never a pile.
            </p>
          </div>
        </div>

        <button
          className='btn'
          style={{ marginTop: 22 }}
          onClick={() => setStep('signup')}
        >
          Start verse one →
        </button>
      </main>
    )
  }

  if (step === 'signup') return <SignupStep onSignIn={toSignIn} />

  return (
    <main className='onboard-hero'>
      <p className='onboard-brand'>Verse Memorize</p>
      <h1 className='onboard-title'>Memorize Bible Verses Every Day</h1>
      <p className='onboard-sub'>
        Recite core Christian doctrine by referencing to scripture by memory.
      </p>
      <div style={{ marginTop: 26 }}>
        <TasterVerse filled={0} showCurrent={false} />
      </div>
      <button
        className='btn'
        style={{ marginTop: 24 }}
        onClick={() => setStep('taster')}
      >
        Try it
      </button>
      <button
        className='btn-quiet'
        style={{ marginTop: 10 }}
        onClick={toSignIn}
      >
        I already have an account
      </button>
    </main>
  )
}
