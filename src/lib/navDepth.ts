/**
 * How deep each screen sits in the app, which is the whole basis for deciding
 * whether a navigation slides forward, slides back, or doesn't move at all.
 *
 * Depth rather than history direction, because the two disagree. Settings
 * closes with a plain `<Link to='/'>` — a forward navigation that has to play
 * as a pop — and a verse pushed from three different lists pops back to
 * whichever one you came from. Reading the hierarchy off the path gets both
 * right without every back control having to declare itself.
 */

const DEPTHS: Array<[RegExp, number]> = [
  // The tab roots. Switching between them is a swap, not a push.
  [/^\/$/, 0],
  [/^\/practicing\/?$/, 0],
  [/^\/all\/?$/, 0],
  // Pushed on top of a root: the screens that carry a back arrow.
  [/^\/queue\/?$/, 1],
  [/^\/settings\/?$/, 1],
  // A verse sits below all of them. It is reached from the two lists at the
  // root — All and Practicing — but also from the queue, which is itself
  // already pushed, and only ever leaves by going back. Levels can be skipped
  // on the way in without that costing anything, because what decides the
  // direction is which way the depth moved, not how far.
  [/^\/verses\/[^/]+\/?$/, 2],
]

/**
 * `null` for the screens outside the stack — the auth flow and the session
 * runner. They take over the whole display rather than sitting on top of
 * something, so there is nothing for them to slide in over.
 */
export function depthOf(pathname: string): number | null {
  for (const [pattern, depth] of DEPTHS) {
    if (pattern.test(pathname)) return depth
  }
  return null
}

export type Direction = 'push' | 'pop'

/** `null` means don't animate: a tab switch, or either end off the stack. */
export function directionFor(from: string, to: string): Direction | null {
  const a = depthOf(from)
  const b = depthOf(to)
  if (a === null || b === null || a === b) return null
  return b > a ? 'push' : 'pop'
}
