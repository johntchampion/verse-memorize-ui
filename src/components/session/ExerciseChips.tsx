import type { SessionExercise } from '../../api/types'
import { STAGE_LABELS } from '../../lib/exercise'

export function StageChip({
  exercise,
  reviewLabel = 'Review',
}: {
  exercise: SessionExercise
  reviewLabel?: string
}) {
  const isReview = exercise.queue === 'review'
  return (
    <span className={isReview ? 'chip chip-review' : 'chip chip-active'}>
      {isReview ? reviewLabel : STAGE_LABELS[exercise.stage]}
    </span>
  )
}

/**
 * Once a slip is spent the remaining budget matters more than the combo, and
 * showing it is the only way the forgiveness is legible.
 */
export function ScoreChip({
  filled,
  total,
  noun,
  combo,
  misses,
  slipBudget,
}: {
  filled: number
  total: number
  noun: string
  combo: number
  misses: number
  slipBudget: number
}) {
  const slipsLeft = Math.max(0, slipBudget - misses)
  const label =
    misses > 0 && slipBudget > 0
      ? `${slipsLeft} slip${slipsLeft === 1 ? '' : 's'} left`
      : combo >= 2
        ? `🔥 ${combo} in a row`
        : `${filled} of ${total} ${noun}`

  return (
    <span
      className={
        misses > 0 && slipsLeft === 0 ? 'chip chip-relearn' : 'chip chip-streak'
      }
    >
      {label}
    </span>
  )
}
