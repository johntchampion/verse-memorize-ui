import { Link } from 'react-router-dom'
import type { VerseListItem } from '../../api/types'
import { Skeleton } from '../Skeleton'

/** Everything waiting in the practice queue: not memorized, not in a slot. */
function waitingCount(verses: VerseListItem[]): number {
  return verses.filter(
    (v) =>
      v.needsRelearning ||
      v.status === 'not_started' ||
      (v.status === 'active' && v.slot === null),
  ).length
}

/** The row into the queue screen, with its count. */
export default function QueueLink({
  verses,
}: {
  verses: VerseListItem[] | null
}) {
  const waiting = verses ? waitingCount(verses) : null

  return (
    <Link to='/queue' className='queue-link'>
      <span className='queue-link-label'>See what&rsquo;s coming next</span>
      {waiting === null ? (
        <Skeleton variant='text' w={92} h={11} style={{ margin: 0 }} />
      ) : (
        <span className='queue-link-count'>
          {waiting} {waiting === 1 ? 'verse' : 'verses'} waiting
        </span>
      )}
      <span className='queue-link-chev' aria-hidden='true'>
        ›
      </span>
    </Link>
  )
}
