import { useState } from 'react'
import type { SlotVerse } from '../../api/types'
import Sheet from '../Sheet'
import { STAGE_LABELS } from '../../lib/exercise'

/** 1-3 = replace that slot; 0 = no slot, just make it next in the queue. */
export type SlotPick = number

/**
 * Choosing which verse steps aside. The pick lives in here and resets itself
 * once the exit animation is done, so a cleared selection never flickers
 * through on the way out.
 */
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
        {slots.map((slot) => {
          const on = pick === slot.slot
          return (
            <button
              key={slot.userVerseId}
              className={on ? 'theme-option theme-option-on' : 'theme-option'}
              onClick={() => slot.slot !== null && toggle(slot.slot)}
            >
              <span className='theme-option-main'>
                <span className='theme-name'>
                  {slot.reference ?? slot.verseId}
                </span>
                <span className='theme-count'>{STAGE_LABELS[slot.stage]}</span>
              </span>
              <span
                className={on ? 'theme-mark theme-mark-on' : 'theme-mark'}
                aria-hidden='true'
              >
                {on ? '✓' : ''}
              </span>
            </button>
          )
        })}
        {allowQueueFront && (
          <button
            className={
              pick === 0
                ? 'theme-option theme-option-alt theme-option-on'
                : 'theme-option theme-option-alt'
            }
            onClick={() => toggle(0)}
          >
            <span className='theme-option-main'>
              <span className='theme-name'>
                None — put it first in the queue
              </span>
              <span className='theme-count'>
                Keeps all three going; starts the moment a slot frees up
              </span>
            </span>
            <span
              className={pick === 0 ? 'theme-mark theme-mark-on' : 'theme-mark'}
              aria-hidden='true'
            >
              {pick === 0 ? '✓' : ''}
            </span>
          </button>
        )}
      </div>
    </Sheet>
  )
}
