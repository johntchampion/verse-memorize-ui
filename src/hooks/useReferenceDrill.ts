import { useState } from 'react'
import type { Stage } from '../api/types'
import { REFERENCE_SLIP_PER_STEP, usesReferencePhase } from '../lib/exercise'
import { buildReferenceSteps, type ReferenceStep } from '../lib/reference'

/**
 * The book/chapter/verse drill that follows the verse text.
 *
 * The steps are state rather than a memo: building them shuffles, and
 * recomputing would reorder the chips under the user's thumb.
 */
export function useReferenceDrill(
  stage: Stage,
  reference: string,
  textDone: boolean,
) {
  const [steps] = useState<ReferenceStep[] | null>(() =>
    usesReferencePhase(stage) ? buildReferenceSteps(reference) : null,
  )
  const [filled, setFilled] = useState(0)
  const [misses, setMisses] = useState(0)

  /** The steps once it is the user's turn at them; null skips the phase. */
  const phase = textDone ? steps : null
  const step = phase && filled < phase.length ? phase[filled] : null
  // Outlives `step` by one: the last board stays on screen, frozen, rather than
  // the dock emptying out while the user reaches for Next.
  const board = phase ? phase[Math.min(filled, phase.length - 1)] : null

  return {
    phase,
    step,
    board,
    filled,
    misses,
    slipBudget: (steps?.length ?? 0) * REFERENCE_SLIP_PER_STEP,
    advance: () => setFilled(filled + 1),
    addMiss: () => setMisses((count) => count + 1),
  }
}
