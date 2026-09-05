import type { SessionEventBody, SessionEventKind } from '../api/types'
import { STAGE_LABELS } from './exercise'

/** A moment worth recapping on the completion screen. */
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

/** Toast copy, for the moment a move happens rather than the recap of it. */
const TOASTS: Record<SessionEventKind, string | null> = {
  tier_up: null, // Names the tier it reached; built below.
  tier_down: null,
  graduated: 'Graduated! Now in review',
  mastered: 'Mastered — fully memorized',
  // The miss that cost mastery is also the first of review's two strikes.
  lost_mastery: 'Lost mastery — back in review, one strike in',
  demoted_to_learning: 'Back into practice at heavy blanks',
  relearning_queued: 'Slipped twice — waiting for a slot to relearn',
  // A slot filling is worth recapping at the end, but it isn't about the
  // answer just given, so it doesn't interrupt with a toast.
  slot_filled: null,
  slot_returned: null,
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

/**
 * What to say out loud when a move lands mid-session, or null for a move that
 * isn't worth interrupting for.
 */
export function eventToast(event: SessionEventBody): string | null {
  const fixed = TOASTS[event.kind]
  if (fixed) return fixed

  const to = event.stageTo
  if (!to) return null
  if (event.kind === 'tier_up') {
    return `Nice — moving to ${STAGE_LABELS[to].toLowerCase()}`
  }
  if (event.kind === 'tier_down') {
    return `Slipped back to ${STAGE_LABELS[to].toLowerCase()}`
  }
  return null
}
