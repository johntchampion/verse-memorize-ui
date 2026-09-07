import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../lib/cx'
import type { SheetLayer } from '../lib/sheetStack'
import { useOverflows } from '../hooks/useOverflows'
import { useSheetDrag } from '../hooks/useSheetDrag'
import { useSheetSpring } from '../hooks/useSheetSpring'
import { useSheetStack } from '../hooks/useSheetStack'

interface Props {
  /** The sheet mounts on true and unmounts once the exit has played, so every
      dismissal is just a flip of this flag. */
  open: boolean
  label: string
  onClose: () => void
  /** Fires after the exit animation — where to reset the sheet's own state. */
  onExited?: () => void
  /** Pinned to the bottom of the frame, always in reach however long the body. */
  footer?: React.ReactNode
  /** False for a choice that has to be made here: the backdrop, Escape and the
      drag all stop closing it, and the grab handle goes away with them. */
  dismissible?: boolean
  /** `auto` hugs the content; the other two park at a fixed height for
      list-heavy views that would otherwise jump about. */
  size?: 'auto' | 'tall' | 'full'
  children: React.ReactNode
}

/**
 * Bottom sheet over a dimmed backdrop — drag it down, tap outside, or press
 * Escape to dismiss. The body scrolls inside the frame while the footer stays
 * put, and the page behind holds still.
 */
export default function Sheet({
  open,
  label,
  onClose,
  onExited,
  footer,
  dismissible = true,
  size = 'auto',
  children,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  /** The sheet this one opened over, if any — held so the exit can let it back
      up as it starts rather than on the way out of the tree. */
  const belowRef = useRef<SheetLayer | undefined>(undefined)
  /** Both ends of a backdrop tap have to land on the backdrop. */
  const downOnBackdrop = useRef(false)

  const { mounted, depth, panelRef, springRef, heightRef, closingRef } =
    useSheetSpring({ open, onClose, onExited, overlayRef, belowRef })

  const covered = useSheetStack({
    mounted,
    dismissible,
    onClose,
    overlayRef,
    panelRef,
    belowRef,
  })

  const scrolls = useOverflows(bodyRef, mounted)

  const draggedRef = useSheetDrag({
    mounted,
    dismissible,
    onClose,
    panelRef,
    bodyRef,
    springRef,
    heightRef,
    closingRef,
  })

  if (!mounted) return null

  return createPortal(
    <div
      className='sheet-overlay'
      ref={overlayRef}
      style={{ opacity: 0 }}
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        // Only a tap that began and ended on the backdrop — a drag released out
        // here started on the sheet and meant nothing by it.
        if (!dismissible || e.target !== e.currentTarget) return
        if (downOnBackdrop.current) onClose()
      }}
    >
      {/* The spring owns the panel's own transform, so the recession behind a
          sheet opened over this one needs a box of its own to shrink. */}
      <div className={covered ? 'sheet-riser sheet-riser-back' : 'sheet-riser'}>
        <div
          className={cx('sheet', `sheet-${size}`, !dismissible && 'sheet-plain')}
          ref={panelRef}
          role='dialog'
          aria-modal='true'
          aria-label={label}
          tabIndex={-1}
          style={
            {
              transform: 'translate3d(0, 100%, 0)',
              // Each sheet this one stands over takes a little off the height,
              // so the card below is left something to show.
              '--sheet-depth': depth,
            } as React.CSSProperties
          }
          onClickCapture={(e) => {
            if (!draggedRef.current) return
            draggedRef.current = false
            e.stopPropagation()
            e.preventDefault()
          }}
        >
          {dismissible && (
            <div className='sheet-grip' aria-hidden='true'>
              <span className='sheet-handle' />
            </div>
          )}
          <div
            className={footer ? 'sheet-body sheet-body-docked' : 'sheet-body'}
            ref={bodyRef}
          >
            {children}
          </div>
          {footer && (
            <div
              className={scrolls ? 'sheet-footer sheet-footer-cut' : 'sheet-footer'}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
