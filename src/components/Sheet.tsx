import { useEffect, useRef, useState } from 'react'

/** Long enough for the exit keyframes in index.css to finish. */
const EXIT_MS = 260

interface Props {
  /** Drives the animation: the sheet mounts on true and unmounts once the
      exit has played, so every dismissal is just a flip of this flag. */
  open: boolean
  /** Accessible name for the dialog. */
  label: string
  onClose: () => void
  /** Fires after the exit animation — where to reset the sheet's own state,
      so a cleared selection doesn't flicker through on the way out. */
  onExited?: () => void
  /** Pinned to the bottom of the frame: the primary action and its cancel,
      always in reach however long the body gets. */
  footer?: React.ReactNode
  children: React.ReactNode
}

/**
 * Bottom sheet over a dimmed backdrop — tap outside or Escape to dismiss. It
 * slides up over the page and back down again, and never grows past 85% of
 * the viewport: the body scrolls inside the frame while the footer stays put.
 */
export default function Sheet({
  open,
  label,
  onClose,
  onExited,
  footer,
  children,
}: Props) {
  // `open` leads, `mounted` trails it by the length of the exit animation.
  const [mounted, setMounted] = useState(open)
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setMounted(true)
  }

  // The divider only earns its place once the body actually scrolls.
  const [scrolls, setScrolls] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  // Held in a ref so an inline arrow from the caller doesn't restart the
  // exit timer on every render.
  const exited = useRef(onExited)
  useEffect(() => {
    exited.current = onExited
  })

  useEffect(() => {
    if (open || !mounted) return
    const timer = window.setTimeout(() => {
      setMounted(false)
      exited.current?.()
    }, EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [open, mounted])

  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mounted, onClose])

  // Watch the frame and its sections rather than re-measuring per render:
  // this also catches a late web font reflowing the body past the cut-off.
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const measure = () => setScrolls(el.scrollHeight > el.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    for (const child of el.children) observer.observe(child)
    return () => observer.disconnect()
  }, [mounted])

  if (!mounted) return null

  return (
    <div
      className={open ? 'sheet-overlay' : 'sheet-overlay sheet-closing'}
      onClick={onClose}
    >
      <div
        className='sheet'
        role='dialog'
        aria-modal='true'
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='sheet-handle' aria-hidden='true' />
        <div
          className={footer ? 'sheet-body sheet-body-docked' : 'sheet-body'}
          ref={bodyRef}
        >
          {children}
        </div>
        {footer && (
          <div className={scrolls ? 'sheet-footer sheet-footer-cut' : 'sheet-footer'}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
