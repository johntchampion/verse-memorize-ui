import { Link } from 'react-router-dom'
import ProgressBar from '../ProgressBar'
import { Skeleton } from '../Skeleton'

/**
 * The runner's top row: the way out, how far through, and the count. A total of
 * zero means the session hasn't landed yet, so the rail sits empty and the
 * count stands in for itself.
 */
export default function SessionHeader({
  done,
  total,
}: {
  done: number
  total: number
}) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Link to='/' className='icon-btn' aria-label='Exit session'>
        ✕
      </Link>
      <div style={{ flex: 1 }}>
        <ProgressBar done={done} total={total} />
      </div>
      {total === 0 ? (
        <Skeleton variant='text' w={28} h={12} style={{ margin: 0 }} />
      ) : (
        <span className='progress-count'>
          {done + 1}/{total}
        </span>
      )}
    </header>
  )
}
