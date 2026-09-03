import { Link } from 'react-router-dom'
import type { MeResponse, VerseListItem } from '../../api/types'
import { Skeleton } from '../Skeleton'
import { STAGE_SHORT_LABELS } from '../../lib/exercise'
import { truncate } from '../../lib/verses'

/** Slot rows to stand in for before the profile says how many are filled. */
const SKELETON_SLOTS = 3

/**
 * What's in the slots right now — the far end of the queue, shown so the line
 * has somewhere to lead. The verse list is only for the snippets; those verses
 * aren't in the queue payload.
 */
export default function QueueSlots({
  slots,
  verses,
}: {
  slots: MeResponse['slots'] | null
  verses: VerseListItem[] | null
}) {
  const textById = new Map(verses?.map((v) => [v.id, v.text]) ?? [])

  return (
    <section className='queue-slots-card' aria-label='In your slots now'>
      <div className='eyebrow'>In your slots now</div>

      {!slots ? (
        <div className='queue-slot-rows'>
          {Array.from({ length: SKELETON_SLOTS }, (_, i) => (
            <div key={i} className='queue-slot-row'>
              <span className='queue-slot-dot' aria-hidden='true' />
              <Skeleton variant='text' w={78} h={15} style={{ margin: 0 }} />
              <span className='queue-slot-text'>
                <Skeleton variant='text' w='80%' h={15} style={{ margin: 0 }} />
              </span>
              <Skeleton variant='chip' w={52} h={22} />
            </div>
          ))}
        </div>
      ) : slots.active.length === 0 ? (
        <p className='small muted' style={{ fontWeight: 700, marginTop: 8 }}>
          No verses in practice — the queue fills your slots.
        </p>
      ) : (
        <div className='queue-slot-rows'>
          {slots.active.map((slot) => (
            <Link
              key={slot.userVerseId}
              to={`/verses/${slot.verseId}`}
              className='queue-slot-row'
            >
              <span className='queue-slot-dot' aria-hidden='true' />
              <span className='queue-slot-ref'>
                {slot.reference ?? slot.verseId}
              </span>
              <span className='queue-slot-text'>
                {truncate(textById.get(slot.verseId) ?? '')}
              </span>
              <span className='chip chip-active'>
                {STAGE_SHORT_LABELS[slot.stage]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
