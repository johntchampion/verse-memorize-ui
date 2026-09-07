import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Whether the history change in flight was asked for by the app or by the
 * browser's own back control. Both arrive as a POP, but a browser-driven back
 * has already been drawn by the browser — animating it again replays the screen
 * the user just left.
 *
 * Set on the way out, read during the next render, cleared once it commits.
 */
let appInitiated = false

/** A pure read: React may run a render more than once for the same update. */
export function isAppNavigation() {
  return appInitiated
}

export function clearAppNavigation() {
  appInitiated = false
}

/** Every in-app back control should use this rather than `navigate(-1)` — an
    unmarked pop is taken to be the browser's own and will not animate. */
export function useBack() {
  const navigate = useNavigate()
  return useCallback(() => {
    appInitiated = true
    navigate(-1)
  }, [navigate])
}
