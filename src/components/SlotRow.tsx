import { Link } from 'react-router-dom'
import type { SlotVerse } from '../api/types'
import {
  LEARNING_ORDER,
  STAGE_LABELS,
  TIER_ADVANCE_THRESHOLD,
  TIER_DOWNGRADE_THRESHOLD,
} from '../lib/exercise'

/** Snippet length that keeps the card to a single quoted line or two. */
const SNIPPET_CHARS = 60

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

function truncate(text: string): string {
  if (text.length <= SNIPPET_CHARS) return text
  const cut = text.slice(0, SNIPPET_CHARS)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 1))}…`
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
