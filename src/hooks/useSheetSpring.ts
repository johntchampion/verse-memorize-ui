import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { reducedMotion } from '../lib/motion'
import { stackDepth, type SheetLayer } from '../lib/sheetStack'
import { CLOSE, SETTLE, createSpring } from '../lib/spring'
import { useLatest } from './useLatest'
import { useScrollLock } from './useScrollLock'

interface Options {
  open: boolean
  onClose: () => void
  onExited?: () => void
  overlayRef: RefObject<HTMLDivElement | null>
  belowRef: RefObject<SheetLayer | undefined>
}

/**
 * The panel's transform, written straight to the node — a drag at 120fps has no
 * business re-rendering React. `open` leads and `mounted` trails it until the
 * exit spring comes to rest.
 */
export function useSheetSpring({
  open,
  onClose,
  onExited,
  overlayRef,
  belowRef,
}: Options) {
  const [mounted, setMounted] = useState(open)
  const [prevOpen, setPrevOpen] = useState(open)
  // Read as it opens: the sheets below registered in earlier commits, so the
  // count is settled and the height is right before the panel is measured.
  const [depth, setDepth] = useState(() => (open ? stackDepth() : 0))
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setMounted(true)
      setDepth(stackDepth())
    }
  }

  const panelRef = useRef<HTMLDivElement>(null)
  const springRef = useRef<ReturnType<typeof createSpring> | null>(null)
  /** Re-measured at the starts of things: reading it inside the animation
      would reflow on every tick. */
  const heightRef = useRef(0)
  /** The spring is on its way off-screen and should unmount when it lands. */
  const closingRef = useRef(false)

  const latest = useLatest({ open, onClose, onExited })

  useScrollLock(mounted)

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
  }, [mounted, latest])

  // Re-targeting a spring that is already moving is continuous, so flipping
  // `open` mid-drag or mid-flight is safe.
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
      // A frame's grace: the backdrop has to have painted at its starting
      // opacity for the transition to have something to run from.
      const lit = requestAnimationFrame(() => {
        overlay.style.opacity = '1'
      })
      return () => cancelAnimationFrame(lit)
    }

    overlay.style.opacity = '0'
    // Alongside the exit rather than on unmount, or the card below sits in its
    // receded state after the sheet that pushed it back is already gone.
    belowRef.current?.cover(false)
    if (reducedMotion()) {
      spring.set(heightRef.current)
      // A frame later, so the panel paints where it landed before the tree goes.
      const frame = requestAnimationFrame(() => {
        setMounted(false)
        latest.current.onExited?.()
      })
      return () => cancelAnimationFrame(frame)
    }
    spring.to(heightRef.current, undefined, CLOSE)
  }, [open, mounted, overlayRef, belowRef, latest])

  return { mounted, depth, panelRef, springRef, heightRef, closingRef }
}
