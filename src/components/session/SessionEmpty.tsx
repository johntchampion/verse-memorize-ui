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
          ? 'There are no verses in your practice slots to drill.'
          : 'Nothing is due right now. Come back tomorrow.'}
      </p>
      <Link to='/' className='btn-ghost'>
        Back to home
      </Link>
    </main>
  )
}
