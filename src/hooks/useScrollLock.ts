import { useEffect } from 'react'

/** Counted rather than flagged, so a second sheet closing can't unlock the
    page while the first is still up. */
let locks = 0
let restoreTo = 0

/**
 * Freezes the document behind an overlay. `position: fixed` rather than
 * `overflow: hidden`: on the iOS home screen hidden overflow still lets a touch
 * drag the page.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return

    const body = document.body
    if (locks++ === 0) {
      restoreTo = window.scrollY
      body.style.position = 'fixed'
      body.style.top = `-${restoreTo}px`
      body.style.left = '0'
      body.style.right = '0'
      body.style.width = '100%'
      body.style.overflow = 'hidden'
    }

    return () => {
      if (--locks > 0) return
      body.style.position = ''
      body.style.top = ''
      body.style.left = ''
      body.style.right = ''
      body.style.width = ''
      body.style.overflow = ''
      // Instant even if something up the tree asked for smooth scrolling:
      // returning to where you were shouldn't look like a scroll.
      const html = document.documentElement
      const behavior = html.style.scrollBehavior
      html.style.scrollBehavior = 'auto'
      window.scrollTo(0, restoreTo)
      html.style.scrollBehavior = behavior
    }
  }, [active])
}
