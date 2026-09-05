import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const EXIT_MS = 180

interface Props {
  open: boolean
  title: string
  message: ReactNode
  /** Which icon and wash to show — a hard stop vs. something to recover from. */
  tone?: 'danger' | 'warning'
  primaryLabel: string
  onPrimary: () => void
  /** Plain-text second action, e.g. an exit while the primary retries. */
  secondaryLabel?: string
  onSecondary?: () => void
  /** Backdrop tap and Escape both call this. */
  onClose: () => void
  /** False for a choice that has to be made here: the backdrop and Escape stop closing it. */
  dismissible?: boolean
  /** Extra controls under the two buttons, e.g. a route's own way back. */
  extra?: ReactNode
}

/**
 * Centered modal over a dimmed backdrop for an error that needs acknowledging
 * — the confirm/recover alert. Portals to the body and leaves whatever the
 * page was showing untouched underneath.
 */
export default function Alert({
  open,
  title,
  message,
  tone = 'danger',
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onClose,
  dismissible = true,
  extra,
}: Props) {
  // `open` leads, `mounted` and `visible` trail it — mounting (and dropping
  // `visible` on the way out) happen at render time, same trick Sheet.tsx
  // uses, so only the async half (the rAF and the exit timer) lives in the
  // effect below.
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(open)
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setMounted(true)
    else setVisible(false)
  }

  const cardRef = useRef<HTMLDivElement>(null)
  const downOnBackdrop = useRef(false)
  const titleId = useId()
  const messageId = useId()

  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = setTimeout(() => setMounted(false), reduced ? 0 : EXIT_MS)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!mounted) return
    const root = document.getElementById('root')
    const previous = document.activeElement
    root?.setAttribute('inert', '')
    cardRef.current?.focus({ preventScroll: true })
    return () => {
      root?.removeAttribute('inert')
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true })
    }
  }, [mounted])

  useEffect(() => {
    if (!mounted || !dismissible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mounted, dismissible, onClose])

  if (!mounted) return null

  return createPortal(
    <div
      className={visible ? 'alert-overlay alert-overlay-visible' : 'alert-overlay'}
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (!dismissible || e.target !== e.currentTarget) return
        if (downOnBackdrop.current) onClose()
      }}
    >
      <div
        className={visible ? 'alert-card alert-card-visible' : 'alert-card'}
        role='alertdialog'
        aria-modal='true'
        aria-labelledby={titleId}
        aria-describedby={messageId}
        tabIndex={-1}
        ref={cardRef}
      >
        <span className={`alert-icon alert-icon-${tone}`} aria-hidden='true'>
          {tone === 'warning' ? '⚠' : '!'}
        </span>
        <h1 id={titleId} className='alert-title'>
          {title}
        </h1>
        <p id={messageId} className='alert-message'>
          {message}
        </p>
        <button className='btn' style={{ marginTop: 20 }} onClick={onPrimary}>
          {primaryLabel}
        </button>
        {secondaryLabel && (
          <button
            className='btn-quiet'
            style={{ width: '100%', marginTop: 8 }}
            onClick={onSecondary ?? onClose}
          >
            {secondaryLabel}
          </button>
        )}
        {extra}
      </div>
    </div>,
    document.body,
  )
}
