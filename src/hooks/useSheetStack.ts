import { useEffect, useState, type RefObject } from 'react'
import {
  isTopLayer,
  pushLayer,
  removeLayer,
  stackDepth,
  topLayer,
  type SheetLayer,
} from '../lib/sheetStack'
import { useLatest } from './useLatest'

interface Options {
  mounted: boolean
  dismissible: boolean
  onClose: () => void
  overlayRef: RefObject<HTMLDivElement | null>
  panelRef: RefObject<HTMLDivElement | null>
  belowRef: RefObject<SheetLayer | undefined>
}

/**
 * Registers this sheet on the stack and takes the page away from everything
 * behind it. `inert` on the app root does the whole job of a focus trap; the
 * sheet this one opens over needs the same treatment by hand.
 *
 * Returns whether another sheet has since opened over this one — the stack is
 * the depth cue, so a covered sheet recedes rather than being swapped out.
 */
export function useSheetStack({
  mounted,
  dismissible,
  onClose,
  overlayRef,
  panelRef,
  belowRef,
}: Options): boolean {
  const [covered, setCovered] = useState(false)
  const latestClose = useLatest(onClose)

  useEffect(() => {
    if (!mounted) return
    const overlay = overlayRef.current
    const root = document.getElementById('root')
    const previous = document.activeElement
    const below = topLayer()
    belowRef.current = below
    below?.overlay.setAttribute('inert', '')
    below?.cover(true)
    if (overlay) pushLayer({ overlay, cover: setCovered })
    root?.setAttribute('inert', '')
    panelRef.current?.focus({ preventScroll: true })
    return () => {
      if (overlay) removeLayer(overlay)
      below?.overlay.removeAttribute('inert')
      below?.cover(false)
      belowRef.current = undefined
      // The last one out gives the page back; an inner sheet closing must not.
      if (stackDepth() === 0) root?.removeAttribute('inert')
      // After the un-inert, so focus can land back inside the sheet below.
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true })
    }
  }, [mounted, overlayRef, panelRef, belowRef])

  useEffect(() => {
    if (!mounted || !dismissible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Only the sheet on top: the ones underneath stay where they are.
      if (!isTopLayer(overlayRef.current)) return
      latestClose.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mounted, dismissible, overlayRef, latestClose])

  return covered
}
