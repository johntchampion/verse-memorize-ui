import { Link } from 'react-router-dom'
import type { SessionTodayResponse } from '../../api/types'
import { Skeleton } from '../Skeleton'

/**
 * Stands in for whichever of the two blocks lands — the coral CTA or the
 * "All caught up" card. Neutral, and sized between the two so the settle is
 * small in either direction; the box metrics are cta-center's.
 */
function CtaSkeleton() {
  return (
    <div className='card' style={{ padding: 22, borderRadius: 26 }}>
      <Skeleton variant='text' h={26} w='70%' style={{ margin: '0 auto' }} />
      <Skeleton
        variant='text'
        h={14}
        w='46%'
        style={{ margin: '10px auto 0' }}
      />
    </div>
  )
}

/** The one big button on the Today tab — or the card that says there isn't one. */
export default function TodayCta({
  session,
}: {
  session: SessionTodayResponse | null
}) {
  if (!session) return <CtaSkeleton />

  const { exercises } = session
  if (exercises.length === 0) {
    return (
      <div className='card' style={{ textAlign: 'center' }}>
        <p style={{ fontWeight: 800 }}>All caught up</p>
        <p className='small muted' style={{ marginTop: 2 }}>
          Nothing due today. Come back tomorrow.
        </p>
      </div>
    )
  }

  const verseCount = new Set(exercises.map((e) => e.verseId)).size
  return (
    <Link to='/session' className='cta cta-center'>
      <span className='cta-title'>Start today&rsquo;s practice</span>
      <span className='cta-sub'>
        {verseCount} {verseCount === 1 ? 'verse' : 'verses'} ·{' '}
        {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
      </span>
    </Link>
  )
}
