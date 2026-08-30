import { Link } from 'react-router-dom'
import { api } from '../api/client'
import TabBar from '../components/TabBar'
import { useApi } from '../hooks/useApi'

const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
]

/** "make it thirteen" reads warmer than "make it 13"; digits past twenty. */
function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n)
}

/**
 * The Today tab: one big streak circle and one big button. Everything else
 * lives on the other tabs.
 */
export default function Today() {
  const me = useApi(() => api.me())
  const session = useApi(() => api.sessionToday())

  if (me.loading || session.loading) {
    return (
      <>
        <main className='shell shell-tabbed'>
          <p className='muted'>Loading…</p>
        </main>
        <TabBar />
      </>
    )
  }

  if (me.error || session.error || !me.data || !session.data) {
    return (
      <>
        <main className='shell shell-tabbed stack'>
          <p className='error-text'>
            {me.error ?? session.error ?? 'Something went wrong.'}
          </p>
          <button
            className='btn-ghost'
            onClick={() => {
              me.refetch()
              session.refetch()
            }}
          >
            Try again
          </button>
        </main>
        <TabBar />
      </>
    )
  }

  const { streak, completedToday } = me.data
  const exercises = session.data.exercises
  const pending = exercises.length > 0
  const verseCount = new Set(exercises.map((e) => e.verseId)).size

  const copy = !pending
    ? 'Done for today. Come back tomorrow.'
    : completedToday
      ? "Streak's in for today — extra practice never hurts."
      : streak > 0
        ? `Practice today to make it ${numberWord(streak + 1)}.`
        : 'Practice today to start your streak.'

  return (
    <>
      <main className='shell shell-tabbed today-shell'>
        <header
          className='screen-header'
          style={{ justifyContent: 'space-between', marginBottom: 0 }}
        >
          <span className='wordmark'>Verse Memorize</span>
          <Link to='/settings' className='icon-btn' aria-label='Settings'>
            ⚙
          </Link>
        </header>

        <div className='today-hero'>
          <div className='streak-hero'>
            <div className='streak-hero-circle'>
              <span className='streak-hero-count'>{streak}</span>
              <span className='streak-hero-label'>day streak</span>
            </div>
            <p className='today-copy'>{copy}</p>
          </div>

          <div>
            {pending ? (
              <Link to='/session' className='cta cta-center'>
                <span className='cta-title'>Start today&rsquo;s practice</span>
                <span className='cta-sub'>
                  {verseCount} {verseCount === 1 ? 'verse' : 'verses'} ·{' '}
                  {exercises.length}{' '}
                  {exercises.length === 1 ? 'exercise' : 'exercises'}
                </span>
              </Link>
            ) : (
              <div className='card' style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 800 }}>All caught up</p>
                <p className='small muted' style={{ marginTop: 2 }}>
                  Nothing due today. Come back tomorrow.
                </p>
              </div>
            )}
            <p className='today-aside'>Everything else can wait.</p>
          </div>
        </div>
      </main>
      <TabBar />
    </>
  )
}
