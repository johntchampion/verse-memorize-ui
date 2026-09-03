import { Link } from 'react-router-dom'
import type { QueueVerse } from '../../api/types'
import { Skeleton } from '../Skeleton'
import { truncate } from '../../lib/verses'

/** Waiting-list rows to stand in for — about a screenful. */
const SKELETON_ROWS = 6

/** Snippet placeholder widths, varied so the list doesn't look printed. */
const SKELETON_WIDTHS = ['84%', '68%', '90%', '74%', '62%', '86%']

function QueueChip({ verse }: { verse: QueueVerse }) {
  if (verse.relearning)
    return <span className='chip chip-relearn'>Relearning</span>
  if (verse.inProgress)
    return <span className='chip chip-practice'>In progress</span>
  return null
}

/** A waiting-list row with its position real and everything else pending. */
function QueueRowSkeleton({ index, width }: { index: number; width: string }) {
  return (
    <li className='queue-row'>
      <span className='queue-num' aria-hidden='true'>
        {index + 1}
      </span>
      <span className='queue-row-main'>
        <span className='queue-row-head'>
          <Skeleton variant='text' w='40%' h={14} />
        </span>
        <Skeleton variant='text' w={width} style={{ marginTop: 4 }} />
      </span>
      <span className='queue-arrows'>
        <button className='queue-arrow' disabled aria-hidden='true' tabIndex={-1}>
          ▲
        </button>
        <button className='queue-arrow' disabled aria-hidden='true' tabIndex={-1}>
          ▼
        </button>
      </span>
    </li>
  )
}

/**
 * The waiting line, in the order slot refill will consume it. The order is
 * edited optimistically upstream, so this renders whatever ids it is handed
 * rather than the fetched order.
 */
export default function QueueList({
  ids,
  byId,
  onMove,
}: {
  /** Null until the queue lands. */
  ids: string[] | null
  byId: Map<string, QueueVerse>
  onMove: (index: number, delta: number) => void
}) {
  if (!ids) {
    return (
      <ol className='queue-list'>
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <QueueRowSkeleton key={i} index={i} width={SKELETON_WIDTHS[i]} />
        ))}
      </ol>
    )
  }

  return (
    <ol className='queue-list' aria-label='Practice queue'>
      {ids.map((id, index) => {
        const verse = byId.get(id)
        if (!verse) return null
        return (
          <li key={id} className='queue-row'>
            <span className='queue-num' aria-hidden='true'>
              {index + 1}
            </span>
            <Link to={`/verses/${id}`} className='queue-row-main'>
              <span className='queue-row-head'>
                <span className='queue-ref'>{verse.reference}</span>
                <QueueChip verse={verse} />
              </span>
              <span className='queue-snippet'>{truncate(verse.text)}</span>
            </Link>
            <span className='queue-arrows'>
              <button
                className='queue-arrow'
                aria-label={`Move ${verse.reference} up`}
                disabled={index === 0}
                onClick={() => onMove(index, -1)}
              >
                ▲
              </button>
              <button
                className='queue-arrow'
                aria-label={`Move ${verse.reference} down`}
                disabled={index === ids.length - 1}
                onClick={() => onMove(index, 1)}
              >
                ▼
              </button>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
