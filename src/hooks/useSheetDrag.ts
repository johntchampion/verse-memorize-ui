import { useEffect, useRef, type RefObject } from 'react'
import { CLOSE, SETTLE, type Spring } from '../lib/spring'
import { useLatest } from './useLatest'

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

interface Options {
  mounted: boolean
  dismissible: boolean
  onClose: () => void
  panelRef: RefObject<HTMLDivElement | null>
  bodyRef: RefObject<HTMLDivElement | null>
  springRef: RefObject<Spring | null>
  heightRef: RefObject<number>
  closingRef: RefObject<boolean>
}

/**
 * Drag-to-dismiss: the panel follows the finger 1:1, resists the wrong way, and
 * carries a throw's velocity into the spring. The returned ref is true when a
 * drag just happened, so the click it produces can be swallowed.
 */
export function useSheetDrag({
  mounted,
  dismissible,
  onClose,
  panelRef,
  bodyRef,
  springRef,
  heightRef,
  closingRef,
}: Options) {
  const draggedRef = useRef(false)
  const latestClose = useLatest(onClose)

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

    /** Asymptotic: pull all you like, it never gives more than RUBBER. */
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
        latestClose.current()
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

    // Native listeners rather than React's: `touchmove` has to be registered
    // non-passively to be cancelable on iOS.
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
  }, [
    mounted,
    dismissible,
    panelRef,
    bodyRef,
    springRef,
    heightRef,
    closingRef,
    latestClose,
  ])

  return draggedRef
}
