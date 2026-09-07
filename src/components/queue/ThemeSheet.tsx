import { useState } from 'react'
import type { QueueTheme } from '../../api/types'
import SelectableRow from '../SelectableRow'
import Sheet from '../Sheet'

export default function ThemeSheet({
  open,
  themes,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean
  themes: QueueTheme[]
  busy: boolean
  onConfirm: (themeId: string) => void
  onClose: () => void
}) {
  const [pick, setPick] = useState<string | null>(null)
  const picked = themes.find((t) => t.id === pick)

  return (
    <Sheet
      open={open}
      label='Bring a theme forward'
      onClose={onClose}
      onExited={() => setPick(null)}
      footer={
        <>
          <button
            className='btn'
            disabled={busy || !picked || picked.queuedCount === 0}
            onClick={() => picked && onConfirm(picked.id)}
          >
            {picked
              ? picked.queuedCount === 0
                ? 'Nothing from that theme is waiting'
                : `Move ${picked.name} to the top`
              : 'Choose a theme'}
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
      <h2 className='sheet-title'>Bring a theme forward</h2>
      <p className='sheet-copy'>
        Every waiting verse of that theme jumps to the front of the queue, in
        its own order. Everything else keeps its place behind them.
      </p>
      <div className='theme-list'>
        {themes.map((theme) => (
          <SelectableRow
            key={theme.id}
            name={theme.name}
            note={`${theme.queuedCount} in queue`}
            selected={pick === theme.id}
            onSelect={() => setPick(pick === theme.id ? null : theme.id)}
          />
        ))}
      </div>
    </Sheet>
  )
}
