import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { reducedMotion } from '../lib/motion'

const EXIT_MS = 180

interface Props {
  open: boolean
  title: string
  message: ReactNode
  /** A hard stop vs. something to recover from. */
  tone?: 'danger' | 'warning'
  primaryLabel: string
  onPrimary: () => void
  secondaryLabel?: string
  onSecondary?: () => void
  onClose: () => void
  /** False for a choice that has to be made here. */
  dismissible?: boolean
  extra?: ReactNode
}

/** Centered confirm/recover modal, portalled over the page. */
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
  // `open` leads; `mounted` trails it until the exit animation has played.
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(open)

  const cardRef = useRef<HTMLDivElement>(null)
  const downOnBackdrop = useRef(false)
  const titleId = useId()
  const messageId = useId()

  useEffect(() => {
    if (open) {
      queueMicrotask(() => setMounted(true))
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    queueMicrotask(() => setVisible(false))
    const timer = setTimeout(
      () => setMounted(false),
      reducedMotion() ? 0 : EXIT_MS,
    )
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
      if (previous instanceof HTMLElement)
        previous.focus({ preventScroll: true })
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
      className={
        visible ? 'alert-overlay alert-overlay-visible' : 'alert-overlay'
      }
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
