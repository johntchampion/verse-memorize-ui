import type { AttemptOutcome, Stage, UserVerse } from '../api/types'
import { LEARNING_ORDER, STAGE_LABELS } from './exercise'

/** A moment worth recapping on the completion screen. */
export interface SessionEvent {
  icon: string
  iconBg: string
  title: string
  detail: string
  detailColor: string
}

/**
 * Everything an attempt moved, worth recapping on the completion screen —
 * losses as well as wins. A session that quietly dropped a verse a tier should
 * say so; that's how the day-to-day rules become learnable.
 */
export function attemptEvent(
  reference: string,
  from: Stage,
  outcome: AttemptOutcome,
): SessionEvent | null {
  const to = outcome.userVerse.stage

  // Parked for relearning. The stage itself is unchanged when no slot was
  // free, so this has to be checked before any stage comparison.
  if (outcome.userVerse.needs_relearning === 1) {
    return {
      icon: '↺',
      iconBg: 'var(--coral-wash)',
      title: reference,
      detail: 'Slipped twice — waiting for a slot',
      detailColor: 'var(--coral-text)',
    }
  }

  // Demoted out of review straight into a free slot.
  if (from === 'review' && to === 'learning_heavy') {
    return {
      icon: '↺',
      iconBg: 'var(--coral-wash)',
      title: reference,
      detail: 'Back to practice at heavy blanks',
      detailColor: 'var(--coral-text)',
    }
  }

  if (from === to) return null

  const fromTier = LEARNING_ORDER.indexOf(from)
  const toTier = LEARNING_ORDER.indexOf(to)
  if (fromTier !== -1 && toTier !== -1) {
    const up = toTier > fromTier
    return {
      icon: up ? '↑' : '↓',
      iconBg: 'var(--coral-wash)',
      title: reference,
      detail: `${STAGE_LABELS[from]} → ${STAGE_LABELS[to]}`,
      detailColor: 'var(--coral-text)',
    }
  }

  if (to === 'review') {
    // From heavy this is graduation; otherwise it's mastery lost.
    const graduated = from === 'learning_heavy'
    return {
      icon: graduated ? '✓' : '↓',
      iconBg: graduated ? 'var(--green-wash)' : 'var(--coral-wash)',
      title: reference,
      detail: graduated
        ? 'Graduated — now in review'
        : 'Lost mastery — back in review',
      detailColor: graduated ? 'var(--green-text)' : 'var(--coral-text)',
    }
  }

  if (to === 'mastered') {
    return {
      icon: '✓',
      iconBg: 'var(--green-wash)',
      title: reference,
      detail: 'Mastered — fully memorized',
      detailColor: 'var(--green-text)',
    }
  }

  return null
}

/**
 * A slot that just filled. A row carrying a `graduated_at` has been through
 * learning before — it's a verse coming back, not a new one arriving.
 */
export function slotFilledEvent(row: UserVerse): SessionEvent {
  const returning = row.graduated_at !== null
  return {
    icon: returning ? '↺' : '🔓',
    iconBg: returning ? 'var(--coral-wash)' : 'var(--amber-wash)',
    title: returning
      ? 'A verse returns to practice'
      : row.slot !== null
        ? `Slot ${row.slot} unlocked`
        : 'New verse unlocked',
    detail: returning
      ? 'Picked up the open slot at heavy blanks'
      : 'A new verse joins your practice',
    detailColor: returning ? 'var(--coral-text)' : 'var(--amber-soft)',
  }
}
