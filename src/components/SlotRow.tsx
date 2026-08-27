import { Link } from 'react-router-dom';
import type { SlotVerse } from '../api/types';
import { STAGE_LABELS } from '../lib/exercise';

/** Consecutive correct answers needed to advance a tier (backend constant). */
const TIER_ADVANCE_THRESHOLD = 3;

interface Props {
  slot: number;
  verse: SlotVerse | null;
  /** How many slots this user has unlocked (1 at signup, +1 per early session). */
  unlocked: number;
}

export default function SlotRow({ slot, verse, unlocked }: Props) {
  if (verse) {
    return (
      <div className="slot-row">
        <span className="slot-number">{slot}</span>
        <div className="slot-body">
          <Link to={`/verses/${verse.verseId}`} className="slot-reference" style={{ color: 'inherit' }}>
            {verse.reference ?? verse.verseId}
          </Link>
          <div className="small muted">
            {STAGE_LABELS[verse.stage]}
            <span className="tier-pips" aria-label={`${verse.correctStreakInTier} of ${TIER_ADVANCE_THRESHOLD} correct in a row`}>
              {Array.from({ length: TIER_ADVANCE_THRESHOLD }, (_, i) => (
                <span key={i} className={i < verse.correctStreakInTier ? 'pip pip-filled' : 'pip'} />
              ))}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Slot ramp-up is session-driven, not calendar-driven (backend §6).
  const sessionsAway = slot - unlocked;
  const copy =
    sessionsAway <= 0
      ? 'All verses assigned'
      : sessionsAway === 1
        ? 'Opens after your next completed session'
        : `Opens after ${sessionsAway} more completed sessions`;

  return (
    <div className="slot-row slot-locked">
      <span className="slot-number">{slot}</span>
      <div className="slot-body">
        <span className="slot-reference">Locked</span>
        <div className="small muted">{copy}</div>
      </div>
    </div>
  );
}
