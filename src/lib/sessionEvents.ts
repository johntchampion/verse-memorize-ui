import type { SessionEventBody, SessionEventKind } from '../api/types'
import { STAGE_LABELS } from './exercise'

/**
 * A moment worth recapping on the completion screen. Moves are never announced
 * while the session runs — they land in the middle of answering, where they
 * only distract — so this is the one place a recorded event becomes copy.
 */
export interface SessionEvent {
  icon: string
  iconBg: string
  title: string
  detail: string
  detailColor: string
}

/**
 * How each kind of move reads. The server decides what happened; this only
 * decides how to say it, which is why there is no comparing of stages left
 * here — every branch is a lookup.
 *
 * Losses are recapped as readily as wins. A session that quietly dropped a
 * verse a tier should say so; that's how the day-to-day rules become learnable.
 */
interface Look {
  icon: string
  iconBg: string
  detailColor: string
  /** Null where the copy has to be built from the stages the verse moved between. */
  detail: string | null
}

const CORAL = { iconBg: 'var(--coral-wash)', detailColor: 'var(--coral-text)' }
const GREEN = { iconBg: 'var(--green-wash)', detailColor: 'var(--green-text)' }
const AMBER = { iconBg: 'var(--amber-wash)', detailColor: 'var(--amber-soft)' }

const PRESENTATION: Record<SessionEventKind, Look> = {
  // Tier moves spell out the two ends, so `detail` is built from the stages.
  tier_up: { icon: '↑', ...CORAL, detail: null },
  tier_down: { icon: '↓', ...CORAL, detail: null },
  graduated: {
    icon: '✓',
    ...GREEN,
    detail: 'Graduated — now in review',
  },
  mastered: {
    icon: '✓',
    ...GREEN,
    detail: 'Mastered — fully memorized',
  },
  lost_mastery: {
    icon: '↓',
    ...CORAL,
    detail: 'Lost mastery — back in review',
  },
  demoted_to_learning: {
    icon: '↺',
    ...CORAL,
    detail: 'Back to practice at heavy blanks',
  },
  relearning_queued: {
    icon: '↺',
    ...CORAL,
    detail: 'Slipped twice — waiting for a slot',
  },
  slot_filled: {
    icon: '🔓',
    ...AMBER,
    detail: 'A new verse joins your practice',
  },
  slot_returned: {
    icon: '↺',
    ...CORAL,
    detail: 'Picked up the open slot at heavy blanks',
  },
}

/** `Easy → Medium`, for the two kinds that move between named tiers. */
function tierMove(event: SessionEventBody): string | null {
  if (!event.stageFrom || !event.stageTo) return null
  return `${STAGE_LABELS[event.stageFrom]} → ${STAGE_LABELS[event.stageTo]}`
}

/** One recorded event, dressed for the completion screen. */
export function presentEvent(event: SessionEventBody): SessionEvent {
  const look = PRESENTATION[event.kind]
  return {
    icon: look.icon,
    iconBg: look.iconBg,
    title: event.reference,
    detail: look.detail ?? tierMove(event) ?? '',
    detailColor: look.detailColor,
  }
}
