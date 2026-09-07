/**
 * Where each screen was scrolled to when it was last navigated away from.
 * Keyed by location key, which React Router hands back unchanged on a history
 * pop — so a screen being returned to finds the entry it wrote on the way out.
 */
const scrollMemory = new Map<string, number>()

export const rememberScroll = (key: string, y: number) =>
  scrollMemory.set(key, y)

export const recallScroll = (key: string) => scrollMemory.get(key) ?? 0

/** How long to keep trying to land a restored offset (ms). Long enough to
    outlast a slow fetch, short enough that a jump this late still reads as the
    screen finishing rather than the page moving on its own. */
const RESTORE_WINDOW = 1500

/** A reader doing any of these has taken over, and the offset stops mattering
    more than what they are currently looking at. */
const GIVE_UP = ['wheel', 'touchstart', 'keydown'] as const

/**
 * Puts the page back where the arriving screen was left.
 *
 * That screen has only just remounted and is usually still fetching, so on the
 * first try the document is a few skeleton rows tall and the offset clamps to
 * almost nothing. Rather than poll blindly, wait for the document to grow and
 * try again on each growth.
 */
export function restoreScroll(y: number) {
  window.scrollTo(0, y)
  if (y === 0 || window.scrollY >= y - 1) return

  let done = false
  const stop = () => {
    if (done) return
    done = true
    observer.disconnect()
    clearTimeout(timer)
    for (const event of GIVE_UP) window.removeEventListener(event, stop)
  }

  const observer = new ResizeObserver(() => {
    window.scrollTo(0, y)
    if (window.scrollY >= y - 1) stop()
  })
  const timer = setTimeout(stop, RESTORE_WINDOW)
  for (const event of GIVE_UP) {
    window.addEventListener(event, stop, { passive: true })
  }
  observer.observe(document.documentElement)
}
