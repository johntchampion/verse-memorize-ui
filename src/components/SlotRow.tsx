import { Link } from 'react-router-dom'
import type { SlotVerse } from '../api/types'
import { Skeleton, SkeletonText } from './Skeleton'
import { truncate } from '../lib/verses'
import {
  LEARNING_ORDER,
  STAGE_LABELS,
  TIER_ADVANCE_THRESHOLD,
  TIER_DOWNGRADE_THRESHOLD,
} from '../lib/exercise'

interface Props {
  slot: number
  verse: SlotVerse | null
  snippet: string | null
  /** The user's local date, for judging whether either run is still live. */
  today: string
}

export default function SlotRow({ slot, verse, snippet, today }: Props) {
  if (verse) {
    const live = verse.streakDate === today
    const run = live ? verse.consecutiveCorrect : 0
    const misses = live ? verse.consecutiveIncorrect : 0

    // learning_light is the floor — nothing below it to warn about.
    const tier = LEARNING_ORDER.indexOf(verse.stage)
    const nextDown = tier > 0 ? LEARNING_ORDER[tier - 1] : null
    const missesLeft = TIER_DOWNGRADE_THRESHOLD - misses
    const atRisk = nextDown !== null && misses > 0 && !verse.tierChangeUsedToday

    return (
      <Link
        to={`/verses/${verse.verseId}`}
        className='slot-card'
        style={{ color: 'inherit', display: 'block' }}
      >
        <div className='slot-card-head'>
          <span className='slot-reference'>
            {verse.reference ?? verse.verseId}
          </span>
          <span className='chip chip-active'>{STAGE_LABELS[verse.stage]}</span>
        </div>
        {snippet && (
          <p className='slot-snippet'>&ldquo;{truncate(snippet)}&rdquo;</p>
        )}

        {verse.tierChangeUsedToday ? (
          // One tier change per verse per day, so a progress bar would lie.
          // `/api/me` doesn't say which direction it moved, so neither do we.
          <div className='advance-row'>
            <span className='advance-label'>
              Tier changed today · next change tomorrow
            </span>
          </div>
        ) : (
          <div
            className='advance-row'
            aria-label={`${run} of ${TIER_ADVANCE_THRESHOLD} correct in a row today`}
          >
            {Array.from({ length: TIER_ADVANCE_THRESHOLD }, (_, i) => (
              <span
                key={i}
                className={
                  i < run ? 'advance-seg advance-seg-filled' : 'advance-seg'
                }
              />
            ))}
            <span className='advance-label'>
              {run} / {TIER_ADVANCE_THRESHOLD} today to upgrade
            </span>
          </div>
        )}

        {atRisk && (
          <p className='slot-risk'>
            {missesLeft === 1
              ? `One more miss today drops to ${STAGE_LABELS[nextDown].toLowerCase()}`
              : `${missesLeft} more misses today drop to ${STAGE_LABELS[nextDown].toLowerCase()}`}
          </p>
        )}
      </Link>
    )
  }

  return (
    <div className='slot-empty'>
      <div>
        <div className='slot-empty-title'>Slot {slot}</div>
        <div className='slot-empty-copy'>
          Open — waiting for a verse to come into practice
        </div>
      </div>
    </div>
  )
}

/** The advance rail renders for real in its empty state, so the card keeps its
    exact height and only the segments fill in when the verse arrives. */
export function SlotRowSkeleton() {
  return (
    <div className='slot-card'>
      <div className='slot-card-head'>
        <Skeleton variant='text' w='44%' h={15} />
        <Skeleton variant='chip' w={78} h={20} />
      </div>
      <p className='slot-snippet' aria-hidden='true'>
        <SkeletonText lines={2} widths={['100%', '54%']} />
      </p>
      <div className='advance-row'>
        {Array.from({ length: TIER_ADVANCE_THRESHOLD }, (_, i) => (
          <span key={i} className='advance-seg' />
        ))}
        <Skeleton variant='text' w={104} h={10} style={{ margin: 0 }} />
      </div>
    </div>
  )
}
