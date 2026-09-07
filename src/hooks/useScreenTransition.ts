import { useLayoutEffect, type RefObject } from 'react'
import type { Location } from 'react-router-dom'
import type { Direction } from '../lib/navDepth'
import { recallScroll, restoreScroll } from '../lib/scrollMemory'
import { createSpring, type SpringConfig } from '../lib/spring'

/**
 * How far the screen behind travels while the one in front covers it, as a
 * share of screen width. iOS moves it at about a third of the front screen's
 * speed; that difference is the entire reason the two read as a stack.
 */
const PARALLAX = 0.3

/** Peak dimming over the screen behind, at the moment it is fully covered. */
const SCRIM = 0.12

/** A whole screen width in about a third of a second. Clamped: a screen is as
    wide as the display, so an overshoot would show a strip of the one behind. */
const TRAVEL: SpringConfig = {
  tension: 250,
  friction: 26,
  mass: 1,
  clamp: true,
}

interface Layer {
  key: string
  location: Location
}

const innerOf = (layer: HTMLElement) => layer.firstElementChild as HTMLElement

/**
 * Runs the spring between the outgoing and incoming screens.
 *
 * Everything is a function of one value — how far the front screen sits off to
 * the right, in pixels. A push runs that down to 0 and a pop runs it back up,
 * which is also what lets a gesture drive the same animation by hand.
 */
export function useScreenTransition({
  transit,
  layers,
  stackRef,
  scrimRef,
  nodes,
  onSettled,
}: {
  transit: Direction | null
  layers: Layer[]
  stackRef: RefObject<HTMLDivElement | null>
  scrimRef: RefObject<HTMLDivElement | null>
  nodes: RefObject<Map<string, HTMLDivElement>>
  onSettled: (to: Layer) => void
}) {
  useLayoutEffect(() => {
    if (transit === null || layers.length !== 2) return
    const stack = stackRef.current
    const scrim = scrimRef.current
    const [from, to] = layers
    const fromEl = nodes.current.get(from.key)
    const toEl = nodes.current.get(to.key)
    if (!stack || !scrim || !fromEl || !toEl) return

    const push = transit === 'push'
    const over = push ? toEl : fromEl
    const under = push ? fromEl : toEl
    // The spring runs in pixels, not a 0-1 fraction: its rest thresholds are in
    // px and px/s, so a value spanning one unit would start out already home.
    const width = stack.clientWidth || window.innerWidth

    const leaving = recallScroll(from.key)
    const landing = push ? 0 : recallScroll(to.key)

    // Out of flow, neither screen has a scroll position of its own any more, so
    // each carries the offset it should be showing at.
    innerOf(fromEl).style.top = `-${leaving}px`
    innerOf(toEl).style.top = `-${landing}px`

    stack.classList.add('nav-transit')

    const frame = (x: number) => {
      const covered = 1 - x / width
      over.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`
      under.style.transform = `translate3d(${(-covered * PARALLAX * width).toFixed(2)}px, 0, 0)`
      scrim.style.opacity = (covered * SCRIM).toFixed(3)
    }

    const spring = createSpring(frame, () => onSettled(to))
    spring.set(push ? width : 0)
    spring.to(push ? 0 : width, 0, TRAVEL)

    // Runs in the commit that drops back to a single layer, before the browser
    // paints — so the screens are back in flow and the scroll is back where it
    // belongs without a frame of both layers stacked down the page.
    return () => {
      spring.stop()
      stack.classList.remove('nav-transit')
      for (const el of [fromEl, toEl]) {
        el.style.transform = ''
        innerOf(el).style.top = ''
      }
      scrim.style.opacity = ''
      restoreScroll(landing)
    }
  }, [transit, layers, stackRef, scrimRef, nodes, onSettled])
}
