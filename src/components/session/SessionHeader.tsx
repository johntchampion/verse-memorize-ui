import { Link } from 'react-router-dom'
import ProgressBar from '../ProgressBar'
import { Skeleton } from '../Skeleton'

/** The runner's top row. The count reads one ahead of `done` because it names
    the exercise in hand, clamping at the total once there is no next one. */
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
          {Math.min(done + 1, total)}/{total}
        </span>
      )}
    </header>
  )
}
