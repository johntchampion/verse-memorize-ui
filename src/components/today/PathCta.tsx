import { Link } from 'react-router-dom'
import type { MeResponse } from '../../api/types'
import type { Path } from '../../lib/path'
import { Skeleton } from '../Skeleton'

/** Leads exactly where the live stop leads, until the plan is finished — then
    it becomes the way into extra practice, which counts toward nothing. */
export default function PathCta({
  path,
  slots,
}: {
  path: Path | null
  slots: MeResponse['slots'] | null
}) {
  // Sized to the button it stands in for, so the settle is small either way.
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

  // Nothing due and nothing in a slot: nothing to enter and nothing to drill.
  if (path.total === 0) return null

  if (path.complete) {
    if (slots && slots.active.length === 0) {
      return (
        <div className='path-note'>
          <p className='eyebrow'>Nothing in practice</p>
          <p className='path-note-copy'>
            Every verse is in review right now. If one slips, it comes back to
            practice and your slots fill again.
          </p>
        </div>
      )
    }

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
