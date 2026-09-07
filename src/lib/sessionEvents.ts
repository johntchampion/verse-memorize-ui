import type { SessionEventBody, SessionEventKind } from '../api/types'
import { STAGE_LABELS } from './exercise'

export interface SessionEvent {
  icon: string
  iconBg: string
  title: string
  detail: string
  detailColor: string
}

interface Look {
  icon: string
  iconBg: string
  detailColor: string
  /** Null where the copy is built from the stages the verse moved between. */
  detail: string | null
}

const CORAL = { iconBg: 'var(--coral-wash)', detailColor: 'var(--coral-text)' }
const GREEN = { iconBg: 'var(--green-wash)', detailColor: 'var(--green-text)' }
const AMBER = { iconBg: 'var(--amber-wash)', detailColor: 'var(--amber-soft)' }

const PRESENTATION: Record<SessionEventKind, Look> = {
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
