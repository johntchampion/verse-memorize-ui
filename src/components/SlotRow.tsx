import { Link } from 'react-router-dom';
import type { SlotVerse } from '../api/types';
import { STAGE_LABELS } from '../lib/exercise';

/** Consecutive correct answers needed to advance a tier (backend constant). */
const TIER_ADVANCE_THRESHOLD = 3;

/** Snippet length that keeps the card to a single quoted line or two. */
const SNIPPET_CHARS = 60;

interface Props {
  slot: number;
  verse: SlotVerse | null;
  /** How many slots this user has unlocked (1 at signup, +1 per early session). */
  unlocked: number;
  /** Opening of the verse text, quoted on the card; null while unknown. */
  snippet: string | null;
}

function truncate(text: string): string {
  if (text.length <= SNIPPET_CHARS) return text;
  const cut = text.slice(0, SNIPPET_CHARS);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 1))}…`;
}

export default function SlotRow({ slot, verse, unlocked, snippet }: Props) {
  if (verse) {
    return (
      <Link to={`/verses/${verse.verseId}`} className="slot-card" style={{ color: 'inherit', display: 'block' }}>
        <div className="slot-card-head">
          <span className="slot-reference">{verse.reference ?? verse.verseId}</span>
          <span className="chip chip-active">{STAGE_LABELS[verse.stage]}</span>
        </div>
        {snippet && <p className="slot-snippet">&ldquo;{truncate(snippet)}&rdquo;</p>}
        <div
          className="advance-row"
          aria-label={`${verse.correctStreakInTier} of ${TIER_ADVANCE_THRESHOLD} correct in a row`}
        >
          {Array.from({ length: TIER_ADVANCE_THRESHOLD }, (_, i) => (
            <span
              key={i}
              className={i < verse.correctStreakInTier ? 'advance-seg advance-seg-filled' : 'advance-seg'}
            />
          ))}
          <span className="advance-label">
            {verse.correctStreakInTier} / {TIER_ADVANCE_THRESHOLD} to advance
          </span>
        </div>
      </Link>
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
    <div className="slot-locked">
      <span className="slot-locked-icon" aria-hidden="true">
        🔒
      </span>
      <div>
        <div className="slot-locked-title">Slot {slot}</div>
        <div className="slot-locked-copy">{copy}</div>
      </div>
    </div>
  );
}
