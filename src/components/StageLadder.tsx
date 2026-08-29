import type { Stage } from '../api/types'
import {
  STAGE_SEQUENCE,
  STAGE_SHORT_LABELS,
  isLearningStage,
} from '../lib/exercise'

/**
 * Where a verse sits on the progression, light through mastered.
 *
 * The first three steps are the *slotted* tiers — a verse in one of them holds
 * one of the three active slots — so a divider marks the graduation boundary
 * rather than another arrow: crossing it is the moment the slot empties.
 */
export default function StageLadder({ stage }: { stage: Stage }) {
  const current = STAGE_SEQUENCE.indexOf(stage)

  return (
    <div
      className="stage-pipeline"
      aria-label={`Progression: ${STAGE_SHORT_LABELS[stage]}`}
    >
      {STAGE_SEQUENCE.map((step, i) => (
        <span key={step} style={{ display: 'contents' }}>
          {i > 0 && (
            <span className="stage-arrow" aria-hidden="true">
              {/* The slotted tiers end at index 2; past it the verse is memorized. */}
              {i === 3 ? '|' : '›'}
            </span>
          )}
          <span
            className={
              i === current
                ? // Coral is the "in practice" accent and green means memorized,
                  // so the marker follows whichever side of graduation we're on.
                  isLearningStage(step)
                  ? 'stage-step stage-step-current'
                  : 'stage-step stage-step-active'
                : i < current
                  ? 'stage-step stage-step-done'
                  : 'stage-step'
            }
          >
            {STAGE_SHORT_LABELS[step]}
          </span>
        </span>
      ))}
    </div>
  )
}
