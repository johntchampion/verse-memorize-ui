import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Whether the history change now in flight was asked for by the app rather
 * than by the browser's own back and forward controls.
 *
 * By the time a navigation reaches the router the two are indistinguishable —
 * both arrive as a POP — but they need opposite treatment. A back the app
 * asked for has had nothing drawn for it yet, and is ours to animate. A back
 * the browser drove has already been drawn by the browser: an edge swipe
 * slides the previous screen in under the reader's finger and is finished
 * before we hear about it. Playing our own pop on top of that brings the
 * screen they just left back over the one they asked for, and then slides it
 * away a second time.
 *
 * Set on the way out, read during the render that follows, and cleared once
 * that render has committed.
 */
let appInitiated = false

/** A pure read: React may run a render more than once for the same update. */
export function isAppNavigation() {
  return appInitiated
}

export function clearAppNavigation() {
  appInitiated = false
}

/**
 * Go back one entry, and record that it was us who asked. Every in-app back
 * control should use this rather than `navigate(-1)` directly — an unmarked
 * pop is taken to be the browser's own, and will not animate.
 */
export function useBack() {
  const navigate = useNavigate()
  return useCallback(() => {
    appInitiated = true
    navigate(-1)
  }, [navigate])
}
