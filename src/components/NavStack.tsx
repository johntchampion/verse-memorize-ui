import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigationType, type Location } from 'react-router-dom'
import { createSpring, type SpringConfig } from '../lib/spring'
import { directionFor, type Direction } from '../lib/navDepth'

/**
 * How far the screen behind travels while the one in front covers it, as a
 * share of screen width. iOS moves it at about a third of the front screen's
 * speed; that difference is the entire reason the two read as a stack rather
 * than as one rectangle swapped for another.
 */
const PARALLAX = 0.3

/** Peak dimming over the screen behind, at the moment it's fully covered. */
const SCRIM = 0.12

/**
 * Travelling a whole screen width, in about a third of a second.
 *
 * Underdamped and clamped, the same pairing `CLOSE` uses and for the same
 * reason: damp it enough not to overshoot and it never actually reaches the
 * target, it only converges on it, and the last few pixels take longer than
 * the rest of the journey put together. Letting it run at the edge and cutting
 * it the instant it crosses gives a decisive arrival — and the overshoot that
 * buys the speed is never drawn, which matters here in a way it doesn't for a
 * sheet: a screen is as wide as the display, so a bounce past the edge would
 * show a strip of the screen behind it.
 */
const TRAVEL: SpringConfig = {
  tension: 250,
  friction: 26,
  mass: 1,
  clamp: true,
}

/** How long to keep trying to land a restored scroll offset (ms). Long enough
    to outlast a slow fetch, short enough that a jump this late still reads as
    the screen finishing rather than as the page moving on its own. */
const RESTORE_WINDOW = 1500

/** A reader doing any of these has taken over, and the offset stops mattering
    more than what they're currently looking at. */
const GIVE_UP = ['wheel', 'touchstart', 'keydown'] as const

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Where each screen was scrolled to when it was last navigated away from.
 * Keyed by location key, which React Router hands back unchanged on a history
 * pop — so a screen being returned to finds the entry it wrote on the way out.
 */
const scrollMemory = new Map<string, number>()

interface Layer {
  key: string
  location: Location
}

const innerOf = (layer: HTMLElement) => layer.firstElementChild as HTMLElement

/**
 * Puts the page back where the arriving screen was left.
 *
 * That screen has only just remounted and is still fetching, so on the first
 * try the document is usually a few skeleton rows tall and the offset clamps to
 * almost nothing. Rather than poll blindly, wait for the document to actually
 * grow and try again on each growth — then stand down the moment it fits, the
 * reader starts scrolling for themselves, or the content stops coming.
 */
function restoreScroll(y: number) {
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

/**
 * The push/pop transition between screens.
 *
 * Normally it renders one screen and gets out of the way: the layers are plain
 * block boxes, the document lays out and scrolls exactly as it would without
 * them. On a navigation that changes depth it holds the outgoing screen on
 * screen alongside the incoming one, lifts both out of the document, and runs a
 * spring between them.
 *
 * Everything is a function of one value — how far the front screen sits off to
 * the right, in pixels, a full screen width for fully off and 0 for fully
 * covering. A push runs that down to 0 and a pop runs it back up. The
 * parameterisation is deliberate: an edge-swipe back is the same animation with
 * a finger setting the offset instead of a spring, and `spring.to` carries its
 * current velocity into a new target, so a gesture can catch a transition
 * already in flight without anything snapping.
 */
export default function NavStack({
  render,
}: {
  render: (location: Location) => ReactNode
}) {
  const location = useLocation()
  const navigationType = useNavigationType()

  const [layers, setLayers] = useState<Layer[]>(() => [
    { key: location.key, location },
  ])
  const [transit, setTransit] = useState<Direction | null>(null)
  const [prevKey, setPrevKey] = useState(location.key)

  // Decided during render, not in an effect: the incoming screen has to be
  // parked off to the right in the same commit that mounts it, or it paints
  // once in its final place before the animation has started.
  if (location.key !== prevKey) {
    setPrevKey(location.key)
    const from = layers[layers.length - 1]
    const next: Layer = { key: location.key, location }
    // A replace is a correction, not a journey — the redirects in App and the
    // auth guards all use one, and none of them should look like a screen.
    const direction =
      navigationType === 'REPLACE' || reducedMotion()
        ? null
        : directionFor(from.location.pathname, location.pathname)

    if (direction === null) {
      setLayers([next])
      setTransit(null)
    } else {
      setLayers([from, next])
      setTransit(direction)
    }
  }

  const stackRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const nodes = useRef(new Map<string, HTMLDivElement>())

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
    // The spring runs in pixels, not in a 0–1 fraction: its rest thresholds
    // are in px and px/s, so a value that only ever spans one unit would be
    // "close enough to home" from the moment it set off.
    const width = stack.clientWidth || window.innerWidth

    // Read before the stack goes fixed: the document collapses under it and
    // takes the scroll position with it.
    const leaving = window.scrollY
    scrollMemory.set(from.key, leaving)
    const landing = push ? 0 : (scrollMemory.get(to.key) ?? 0)

    // Out of flow, neither screen has a scroll position of its own any more,
    // so each one carries the offset it should be showing at.
    innerOf(fromEl).style.top = `-${leaving}px`
    innerOf(toEl).style.top = `-${landing}px`

    stack.classList.add('nav-transit')

    // Written straight to the nodes. A spring at 120fps has no business
    // re-rendering React, and a swipe driving this will be worse. `x` is how
    // far the front screen sits off to the right, in px.
    const frame = (x: number) => {
      const covered = 1 - x / width
      over.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`
      under.style.transform = `translate3d(${(-covered * PARALLAX * width).toFixed(2)}px, 0, 0)`
      scrim.style.opacity = (covered * SCRIM).toFixed(3)
    }

    const spring = createSpring(frame, () => {
      setLayers([to])
      setTransit(null)
    })
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
  }, [transit, layers])

  return (
    <div className='nav-stack' ref={stackRef}>
      {layers.map((layer, i) => (
        <div
          key={layer.key}
          className='nav-layer'
          // The destination is always last; the screen being left can't be
          // tapped through on its way out.
          inert={transit !== null && i === 0}
          data-role={
            transit === null
              ? undefined
              : (transit === 'push') === (i === 1)
                ? 'over'
                : 'under'
          }
          ref={(el) => {
            if (el) nodes.current.set(layer.key, el)
            else nodes.current.delete(layer.key)
          }}
        >
          <div className='nav-layer-inner'>{render(layer.location)}</div>
        </div>
      ))}
      {transit !== null && (
        <div className='nav-scrim' ref={scrimRef} aria-hidden='true' />
      )}
    </div>
  )
}
