/**
 * Depth rather than history direction, because the two disagree: Settings
 * closes with a forward `<Link to='/'>` that has to play as a pop.
 */
const DEPTHS: Array<[RegExp, number]> = [
  // Tab roots. Switching between them is a swap, not a push.
  [/^\/$/, 0],
  [/^\/practicing\/?$/, 0],
  [/^\/all\/?$/, 0],
  [/^\/queue\/?$/, 1],
  [/^\/settings\/?$/, 1],
  [/^\/verses\/[^/]+\/?$/, 2],
]

/** `null` for the screens outside the stack — the auth flow and the session. */
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
