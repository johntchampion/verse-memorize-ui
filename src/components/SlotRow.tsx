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
  /** How many slots this user has unlocked (1 at signup, +1 per early session). */
  unlocked: number
  /** Opening of the verse text, quoted on the card; null while unknown. */
  snippet: string | null
  /** The user's local date, for deciding whether a correct run is still live. */
  today: string
}

export default function SlotRow({
  slot,
  verse,
  unlocked,
  snippet,
  today,
}: Props) {
  if (verse) {
    // The advancing run has to land inside one calendar day, so a run carried
    // over from an earlier day counts for nothing — same as on the server.
    const run = verse.streakDate === today ? verse.consecutiveCorrect : 0

    // learning_light is the floor: two misses there change nothing, so there's
    // no risk worth warning about.
    const tier = LEARNING_ORDER.indexOf(verse.stage)
    const nextDown = tier > 0 ? LEARNING_ORDER[tier - 1] : null
    const missesLeft = TIER_DOWNGRADE_THRESHOLD - verse.consecutiveIncorrect
    const atRisk =
      nextDown !== null &&
      verse.consecutiveIncorrect > 0 &&
      !verse.tierChangeUsedToday

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
          // One tier change per verse per day: today's extra correct answers
          // are practice, so a progress bar toward advancing would be a lie.
          <div className='advance-row'>
            <span className='advance-label'>
              Upgraded today · next upgrade tomorrow
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
              ? `One more miss drops to ${STAGE_LABELS[nextDown].toLowerCase()}`
              : `${missesLeft} more misses drop to ${STAGE_LABELS[nextDown].toLowerCase()}`}
          </p>
        )}
      </Link>
    )
  }

  // Slot ramp-up is session-driven, not calendar-driven (API README, "Slots").
  const sessionsAway = slot - unlocked
  const copy =
    sessionsAway <= 0
      ? 'All verses assigned'
      : sessionsAway === 1
        ? 'Opens after your next completed session'
        : `Opens after ${sessionsAway} more completed sessions`

  return (
    <div className='slot-locked'>
      <span className='slot-locked-icon' aria-hidden='true'>
        🔒
      </span>
      <div>
        <div className='slot-locked-title'>Slot {slot}</div>
        <div className='slot-locked-copy'>{copy}</div>
      </div>
    </div>
  )
}

/**
 * The occupied-slot card with its text replaced by placeholders. The advance
 * rail renders for real in its empty state, so the card keeps its exact height
 * and only the segments fill in when the verse arrives.
 */
export function SlotRowSkeleton() {
  return (
    <div className='slot-card'>
      <div className='slot-card-head'>
        <Skeleton variant='text' w='44%' h={15} />
        <Skeleton variant='chip' w={78} h={20} />
      </div>
      {/* Two lines: the 60-character snippet wraps once at every phone width. */}
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
