import { useState } from 'react'
import type { SlotVerse } from '../../api/types'
import SelectableRow from '../SelectableRow'
import Sheet from '../Sheet'
import { STAGE_LABELS } from '../../lib/exercise'

/** 1-3 = replace that slot; 0 = no slot, just make it next in the queue. */
export type SlotPick = number

export default function SlotPickerSheet({
  open,
  reference,
  slots,
  allowQueueFront,
  busy,
  error,
  onConfirm,
  onClose,
  onExited,
}: {
  open: boolean
  reference: string
  slots: SlotVerse[]
  /** False when the verse is already next in line — there'd be nothing to do. */
  allowQueueFront: boolean
  busy: boolean
  error: string | null
  onConfirm: (pick: SlotPick) => void
  onClose: () => void
  onExited: () => void
}) {
  const [pick, setPick] = useState<SlotPick | null>(null)
  const toggle = (value: SlotPick) => setPick(pick === value ? null : value)

  return (
    <Sheet
      open={open}
      label={`Put ${reference} into practice`}
      onClose={onClose}
      onExited={() => {
        setPick(null)
        onExited()
      }}
      footer={
        <>
          {error && <p className='error-text'>{error}</p>}
          <button
            className='btn'
            disabled={busy || pick === null}
            onClick={() => pick !== null && onConfirm(pick)}
          >
            {pick === null
              ? 'Choose one'
              : pick === 0
                ? 'Make it next in the queue'
                : `Swap it into slot ${pick}`}
          </button>
          <button
            className='btn-quiet'
            style={{ width: '100%', marginTop: 6 }}
            onClick={onClose}
          >
            Cancel
          </button>
        </>
      }
    >
      <h2 className='sheet-title'>Which verse steps aside for {reference}?</h2>
      <p className='sheet-copy'>
        Whichever you choose keeps its progress and comes back as the next verse
        in the queue.
      </p>
      <div className='theme-list'>
        {slots.map((slot) => (
          <SelectableRow
            key={slot.userVerseId}
            name={slot.reference ?? slot.verseId}
            note={STAGE_LABELS[slot.stage]}
            selected={pick === slot.slot}
            onSelect={() => slot.slot !== null && toggle(slot.slot)}
          />
        ))}
        {allowQueueFront && (
          <SelectableRow
            variant='alt'
            name='None — put it first in the queue'
            note='Keeps all three going; starts the moment a slot frees up'
            selected={pick === 0}
            onSelect={() => toggle(0)}
          />
        )}
      </div>
    </Sheet>
  )
}
