import type { ReactNode } from 'react'
import { cx } from '../lib/cx'

interface Props {
  name: ReactNode
  note: ReactNode
  selected: boolean
  onSelect: () => void
  variant?: 'alt'
}

export default function SelectableRow({
  name,
  note,
  selected,
  onSelect,
  variant,
}: Props) {
  return (
    <button
      className={cx(
        'theme-option',
        variant === 'alt' && 'theme-option-alt',
        selected && 'theme-option-on',
      )}
      onClick={onSelect}
    >
      <span className='theme-option-main'>
        <span className='theme-name'>{name}</span>
        <span className='theme-count'>{note}</span>
      </span>
      <span
        className={selected ? 'theme-mark theme-mark-on' : 'theme-mark'}
        aria-hidden='true'
      >
        {selected ? '✓' : ''}
      </span>
    </button>
  )
}
