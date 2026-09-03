import type { RefObject } from 'react'
import type { ReferenceStep } from '../../lib/reference'

/** Placeholder for a slot with nothing in it; the CSS gives it its width. */
const EMPTY = ' '

function RefSlot({ step, state }: { step: ReferenceStep; state: SlotState }) {
  if (state === 'filled') {
    return <span className='blank-filled ref-slot'>{step.answer}</span>
  }

  return (
    <span
      className={`blank ref-slot ref-${step.kind}${state === 'current' ? ' blank-current' : ''}`}
      aria-label={`${step.kind} blank`}
    >
      {EMPTY}
    </span>
  )
}

type SlotState = 'filled' | 'current' | 'empty'

/** The reference as three blanks, filled book then chapter then verse. */
export default function ReferenceLine({
  steps,
  filled,
  lineRef,
}: {
  steps: ReferenceStep[]
  filled: number
  lineRef: RefObject<HTMLParagraphElement | null>
}) {
  const stateOf = (at: number): SlotState =>
    at < filled ? 'filled' : at === filled ? 'current' : 'empty'

  return (
    <p className='verse-ref ref-line' ref={lineRef}>
      <RefSlot step={steps[0]} state={stateOf(0)} />
      <span className='ref-locus'>
        <RefSlot step={steps[1]} state={stateOf(1)} />
        <span aria-hidden='true'>:</span>
        <RefSlot step={steps[2]} state={stateOf(2)} />
      </span>
    </p>
  )
}
