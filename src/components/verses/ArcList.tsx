import { Link } from 'react-router-dom'
import type { VerseListItem } from '../../api/types'
import { Skeleton } from '../Skeleton'
import { isMemorized } from '../../lib/verses'

/** Roughly a viewport's worth — enough to read as a list, not all hundred. */
const SKELETON_ROWS = 8

/** Snippet placeholder widths, varied so the list doesn't look printed. */
const SKELETON_WIDTHS = ['86%', '72%', '92%', '64%', '80%', '88%', '70%', '84%']

function dotClass(verse: VerseListItem): string {
  if (verse.needsRelearning) return 'arc-dot arc-dot-relearn'
  if (isMemorized(verse)) return 'arc-dot arc-dot-memorized'
  if (verse.status === 'active') return 'arc-dot arc-dot-practicing'
  return 'arc-dot'
}

function StatusChip({ verse }: { verse: VerseListItem }) {
  if (verse.needsRelearning)
    return <span className='chip chip-relearn'>Relearning</span>
  if (isMemorized(verse))
    return <span className='chip chip-mastered'>Memorized</span>
  if (verse.status === 'active')
    return <span className='chip chip-practice'>In practice</span>
  return null
}

/**
 * The same row geometry as a real arc row: a dot in its resting colour, the
 * reference, a chip, and the snippet line.
 */
function ArcRowSkeleton({ width }: { width: string }) {
  return (
    <div className='arc-row'>
      <span className='arc-dot' aria-hidden='true' />
      <div className='arc-main'>
        <div className='arc-head'>
          <Skeleton variant='text' w='38%' h={14} />
          <Skeleton variant='chip' w={72} h={18} />
        </div>
        <Skeleton variant='text' w={width} style={{ marginTop: 5 }} />
      </div>
    </div>
  )
}

/** Every verse in the arc, in order — one flat list. */
export default function ArcList({
  verses,
}: {
  verses: VerseListItem[] | null
}) {
  return (
    <div className='arc-list'>
      {verses
        ? verses.map((verse) => (
            <Link
              key={verse.id}
              to={`/verses/${verse.id}`}
              className='arc-row'
              style={{ color: 'inherit' }}
            >
              <span className={dotClass(verse)} aria-hidden='true' />
              <div className='arc-main'>
                <div className='arc-head'>
                  <span className='arc-ref'>{verse.reference}</span>
                  <StatusChip verse={verse} />
                </div>
                <p className='arc-snippet'>{verse.text}</p>
              </div>
            </Link>
          ))
        : Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <ArcRowSkeleton key={i} width={SKELETON_WIDTHS[i]} />
          ))}
    </div>
  )
}
