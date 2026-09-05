import { Link } from 'react-router-dom'
import type { Path } from '../../lib/path'
import { Skeleton } from '../Skeleton'

/**
 * The button under the path. It leads exactly where the live stop on the path
 * leads — into the day's plan at the first exercise still outstanding — until
 * the plan is finished, when it turns into the way to keep drilling instead.
 * Practice is separate work: it counts toward nothing and never comes back
 * with a path to walk.
 */
export default function PathCta({ path }: { path: Path | null }) {
  // Neutral, and sized to the button it stands in for, so the settle is small
  // whichever of the two lands.
  if (!path) {
    return (
      <div className='card' style={{ padding: 22, borderRadius: 26 }}>
        <Skeleton variant='text' h={22} w='58%' style={{ margin: '0 auto' }} />
        <Skeleton
          variant='text'
          h={12}
          w='42%'
          style={{ margin: '8px auto 0' }}
        />
      </div>
    )
  }

  // Nothing due and nothing in a slot: there is no session to enter and no
  // verse to drill either.
  if (path.total === 0) return null

  if (path.complete) {
    return (
      <Link to='/session?practice=1' className='cta cta-center cta-outline'>
        <span className='cta-title'>Keep practicing</span>
        <span className='cta-sub'>One round of each verse in practice</span>
      </Link>
    )
  }

  const next = path.next
  if (!next) return null

  return (
    <Link to='/session' className='cta cta-center'>
      <span className='cta-title'>
        {path.done === 0
          ? 'Start today’s practice'
          : `Resume — ${next.reference}`}
      </span>
      <span className='cta-sub'>{next.meta} · stop after it if you like</span>
    </Link>
  )
}
