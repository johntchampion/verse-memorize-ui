import { Link } from 'react-router-dom'

export default function SessionEmpty({ practice }: { practice: boolean }) {
  return (
    <main className='shell stack'>
      <p className='eyebrow'>
        {practice ? 'Extra practice' : 'Today’s session'}
      </p>
      <h1 style={{ fontFamily: 'var(--serif)' }}>All caught up</h1>
      <p className='muted'>
        {practice
          ? 'Nothing is in your practice slots to drill. Verses come back to practice if they slip in review.'
          : 'Nothing is due right now. Come back tomorrow.'}
      </p>
      <Link to='/' className='btn-ghost'>
        Back to home
      </Link>
    </main>
  )
}
