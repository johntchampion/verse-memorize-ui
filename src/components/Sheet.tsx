import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CLOSE, SETTLE, createSpring } from '../lib/spring'
import { useScrollLock } from '../hooks/useScrollLock'

/** Dragged past this share of its own height, letting go dismisses. */
const DISMISS_RATIO = 0.25
/** Or thrown at least this fast, however short the throw (px/ms). */
const DISMISS_VELOCITY = 0.5
/** How far the panel can be pulled above its resting place before it stops. */
const RUBBER = 64
/** Movement before a touch counts as a drag rather than a tap. */
const SLOP = 4
/** How stale the last movement can be and still count as a throw (ms). A
    finger that flicked and then held still let go of something stationary. */
const THROW_WINDOW = 80

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
  /** False for a choice that has to be made here: the backdrop, Escape and
      the drag all stop closing it, and the grab handle goes away with them. */
  dismissible?: boolean
  /** How tall to stand. `auto` hugs the content, the other two park at a
      fixed height for list-heavy views that would otherwise jump about. */
  size?: 'auto' | 'tall' | 'full'
  children: React.ReactNode
}

/** Whatever a single finger or the mouse is currently doing to the panel. */
interface Drag {
  active: boolean
  /** We own the gesture and the panel is following the finger. */
  claimed: boolean
  /** Handed back to the browser: this one is a scroll, not a drag. */
  yielded: boolean
  /** Started inside the scrolling body, which gets first refusal on it. */
  fromBody: boolean
  startY: number
  /** Panel offset and finger position at the moment we claimed it. */
  baseY: number
  anchorY: number
  lastY: number
  lastAt: number
  /** px/ms, from the most recent pair of samples. */
  velocity: number
}

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Bottom sheet over a dimmed backdrop — drag it down, tap outside, or press
 * Escape to dismiss. It springs up over the page and follows your finger 1:1 on
 * the way back down, resisting if pulled the wrong way and taking the velocity
 * of a throw with it. It never grows past its size cap: the body scrolls inside
 * the frame while the footer stays put, and the page behind holds still.
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
  // `open` leads, `mounted` trails it until the exit spring comes to rest.
  const [mounted, setMounted] = useState(open)
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setMounted(true)
  }

  // The divider only earns its place once the body actually scrolls.
  const [scrolls, setScrolls] = useState(false)

  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const springRef = useRef<ReturnType<typeof createSpring> | null>(null)
  /** The panel's height, re-measured at the starts of things rather than per
      frame — reading it inside the animation would reflow on every tick. */
  const heightRef = useRef(0)
  /** The spring is on its way off-screen and should unmount when it lands. */
  const closingRef = useRef(false)
  /** A drag just happened, so swallow the click it's about to produce. */
  const draggedRef = useRef(false)
  /** Both ends of a backdrop tap have to land on the backdrop. */
  const downOnBackdrop = useRef(false)

  // Latest values, for the handlers that outlive the render that made them.
  const latest = useRef({ open, onClose, onExited })
  useEffect(() => {
    latest.current = { open, onClose, onExited }
  })

  useScrollLock(mounted)

  // One spring per mount, owning the panel's transform — written straight to
  // the node, because a drag at 120fps has no business re-rendering React. The
  // backdrop is not on the spring: it fades with the sheet's arrival and
  // departure and otherwise stays put, however far the panel has been pulled.
  useLayoutEffect(() => {
    if (!mounted) return
    const panel = panelRef.current
    if (!panel) return

    heightRef.current = panel.offsetHeight
    const spring = createSpring(
      (y) => {
        panel.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`
      },
      () => {
        if (!closingRef.current) return
        // Dismissed, but the owner kept us open — a close it declined. Return.
        if (latest.current.open) {
          closingRef.current = false
          spring.to(0, 0, SETTLE)
          return
        }
        setMounted(false)
        latest.current.onExited?.()
      },
    )
    springRef.current = spring
    spring.set(heightRef.current)

    return () => {
      spring.stop()
      springRef.current = null
    }
  }, [mounted])

  // Where `open` actually gets acted on. Re-targeting a spring that's already
  // moving is continuous, so flipping this mid-drag or mid-flight is safe.
  useEffect(() => {
    const spring = springRef.current
    const panel = panelRef.current
    const overlay = overlayRef.current
    if (!mounted || !spring || !panel || !overlay) return

    heightRef.current = panel.offsetHeight
    closingRef.current = !open

    if (open) {
      if (reducedMotion()) spring.set(0)
      else spring.to(0, undefined, SETTLE)
      // A frame's grace: the backdrop needs to have been painted at its
      // starting opacity for the transition to have something to run from.
      const lit = requestAnimationFrame(() => {
        overlay.style.opacity = '1'
      })
      return () => cancelAnimationFrame(lit)
    }

    overlay.style.opacity = '0'
    if (reducedMotion()) {
      spring.set(heightRef.current)
      // A frame later rather than right now, so the panel paints where it
      // landed before the tree goes; there is no animation to wait on.
      const frame = requestAnimationFrame(() => {
        setMounted(false)
        latest.current.onExited?.()
      })
      return () => cancelAnimationFrame(frame)
    }
    spring.to(heightRef.current, undefined, CLOSE)
  }, [open, mounted])

  // `inert` on the app root does the whole job of a focus trap: nothing behind
  // the sheet can be tabbed to, clicked, or read out while it's up.
  useEffect(() => {
    if (!mounted) return
    const root = document.getElementById('root')
    const previous = document.activeElement
    root?.setAttribute('inert', '')
    panelRef.current?.focus({ preventScroll: true })
    return () => {
      root?.removeAttribute('inert')
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true })
    }
  }, [mounted])

  useEffect(() => {
    if (!mounted || !dismissible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') latest.current.onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mounted, dismissible])

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

  // The drag. Native listeners rather than React's: `touchmove` has to be
  // registered non-passively to be cancelable on iOS, and preventing a
  // `pointermove` wouldn't stop the browser scrolling anyway.
  useEffect(() => {
    const panel = panelRef.current
    const spring = springRef.current
    if (!mounted || !panel || !spring) return

    const drag: Drag = {
      active: false,
      claimed: false,
      yielded: false,
      fromBody: false,
      startY: 0,
      baseY: 0,
      anchorY: 0,
      lastY: 0,
      lastAt: 0,
      velocity: 0,
    }

    /** Asymptotic resistance: pull all you like, it never gives more than RUBBER. */
    const resist = (y: number) => {
      const soft = (d: number) => RUBBER * (1 - 1 / (d / RUBBER + 1))
      if (y < 0) return -soft(-y)
      return dismissible ? y : soft(y)
    }

    const begin = (y: number, target: EventTarget | null) => {
      const body = bodyRef.current
      const inBody = !!body && target instanceof Node && body.contains(target)
      drag.active = true
      drag.claimed = false
      // Content scrolled away from its top owns the gesture outright.
      drag.yielded = inBody && body.scrollTop > 0
      drag.fromBody = inBody
      drag.startY = y
      drag.lastY = y
      drag.lastAt = performance.now()
      drag.velocity = 0
      draggedRef.current = false
    }

    const claim = (y: number) => {
      drag.claimed = true
      draggedRef.current = true
      // Catch it wherever it is, mid-flight included.
      spring.stop()
      drag.baseY = spring.value
      drag.anchorY = y
      heightRef.current = panel.offsetHeight
      panel.style.userSelect = 'none'
    }

    /** True once we're driving the panel, which means eating the event. */
    const move = (y: number) => {
      if (!drag.active || drag.yielded) return false

      const now = performance.now()
      const dt = now - drag.lastAt
      // Sample over a few milliseconds; dividing by a sub-millisecond gap
      // turns a stationary finger into a fling.
      if (dt > 4) {
        drag.velocity = (y - drag.lastY) / dt
        drag.lastY = y
        drag.lastAt = now
      }

      if (!drag.claimed) {
        const dy = y - drag.startY
        if (Math.abs(dy) < SLOP) return false
        // At the top of the content and pulling up: that's a scroll.
        if (drag.fromBody && dy < 0) {
          drag.yielded = true
          return false
        }
        claim(y)
      }

      spring.set(resist(drag.baseY + (y - drag.anchorY)))
      return true
    }

    const end = () => {
      if (!drag.active) return
      const claimed = drag.claimed
      drag.active = false
      drag.claimed = false
      drag.yielded = false
      if (!claimed) return

      panel.style.userSelect = ''
      const h = heightRef.current || panel.offsetHeight
      const stale = performance.now() - drag.lastAt > THROW_WINDOW
      const velocity = stale ? 0 : drag.velocity
      // The spring works in px/s; the sampler in px/ms.
      const thrown = velocity * 1000
      const far = spring.value > h * DISMISS_RATIO
      const fast = velocity > DISMISS_VELOCITY
      if (dismissible && (far || fast)) {
        closingRef.current = true
        spring.to(h, thrown, CLOSE)
        latest.current.onClose()
      } else {
        spring.to(0, thrown, SETTLE)
      }
    }

    const onTouchStart = (e: TouchEvent) => {
      // A second finger arriving ends the drag rather than fighting it.
      if (e.touches.length > 1) return end()
      begin(e.touches[0].clientY, e.target)
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) return
      if (move(e.touches[0].clientY) && e.cancelable) e.preventDefault()
    }
    const onMouseMove = (e: MouseEvent) => {
      if (move(e.clientY)) e.preventDefault()
    }
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      end()
    }
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      begin(e.clientY, e.target)
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    }

    panel.addEventListener('touchstart', onTouchStart, { passive: true })
    panel.addEventListener('touchmove', onTouchMove, { passive: false })
    panel.addEventListener('touchend', end)
    panel.addEventListener('touchcancel', end)
    panel.addEventListener('mousedown', onMouseDown)
    return () => {
      panel.removeEventListener('touchstart', onTouchStart)
      panel.removeEventListener('touchmove', onTouchMove)
      panel.removeEventListener('touchend', end)
      panel.removeEventListener('touchcancel', end)
      panel.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      panel.style.userSelect = ''
    }
  }, [mounted, dismissible])

  if (!mounted) return null

  const panelClass = ['sheet', `sheet-${size}`]
  if (!dismissible) panelClass.push('sheet-plain')

  return createPortal(
    <div
      className='sheet-overlay'
      ref={overlayRef}
      style={{ opacity: 0 }}
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        // Only a tap that began and ended on the backdrop — a drag released
        // out here started on the sheet and meant nothing by it.
        if (!dismissible || e.target !== e.currentTarget) return
        if (downOnBackdrop.current) onClose()
      }}
    >
      <div
        className={panelClass.join(' ')}
        ref={panelRef}
        role='dialog'
        aria-modal='true'
        aria-label={label}
        tabIndex={-1}
        style={{ transform: 'translate3d(0, 100%, 0)' }}
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
          <div className={scrolls ? 'sheet-footer sheet-footer-cut' : 'sheet-footer'}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
