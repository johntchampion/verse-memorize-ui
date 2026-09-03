import { Link } from 'react-router-dom'
import type { VerseListItem } from '../../api/types'

/**
 * Verses pulled out of review for repeated misses. They have no due date and
 * sit out of the session entirely until a slot opens up for them. Conditional
 * on the list, and usually empty, so it has no placeholder.
 */
export default function RelearnCard({
  verses,
}: {
  verses: VerseListItem[] | null
}) {
  const relearning = verses?.filter((v) => v.needsRelearning) ?? []
  if (relearning.length === 0) return null

  const one = relearning.length === 1
  return (
    <div className='relearn-card'>
      <div className='eyebrow' style={{ color: 'var(--coral-text)' }}>
        Waiting for a slot
      </div>
      <p className='relearn-copy'>
        {one ? 'This one' : 'These'} slipped in review and {one ? 'comes' : 'come'}{' '}
        back to practice once a slot frees up — that happens when another verse
        graduates.
      </p>
      <ul className='relearn-list'>
        {relearning.map((verse) => (
          <li key={verse.id}>
            <Link to={`/verses/${verse.id}`} className='relearn-ref'>
              {verse.reference}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
