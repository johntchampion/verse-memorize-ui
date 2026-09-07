import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigationType, type Location } from 'react-router-dom'
import { clearAppNavigation, isAppNavigation } from '../hooks/useBack'
import { useScreenTransition } from '../hooks/useScreenTransition'
import { reducedMotion } from '../lib/motion'
import { directionFor, type Direction } from '../lib/navDepth'
import { rememberScroll, recallScroll, restoreScroll } from '../lib/scrollMemory'

interface Layer {
  key: string
  location: Location
}

/**
 * The push/pop transition between screens.
 *
 * Normally it renders one screen and gets out of the way: the layers are plain
 * block boxes and the document lays out and scrolls as it would without them.
 * On a navigation that changes depth it holds both screens on screen, lifts
 * them out of the document, and runs a spring between them.
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

  /** Where a navigation that isn't going to animate should leave the page.
      Nothing else is going to put the scroll right on that path. */
  const [pendingScroll, setPendingScroll] = useState<number | null>(null)

  // Decided during render, not in an effect: the incoming screen has to be
  // parked off to the right in the same commit that mounts it, or it paints
  // once in its final place before the animation has started.
  if (location.key !== prevKey) {
    setPrevKey(location.key)
    const from = layers[layers.length - 1]
    const next: Layer = { key: location.key, location }

    // The last moment the document still belongs to the screen being left.
    rememberScroll(from.key, window.scrollY)

    const direction = directionFor(from.location.pathname, location.pathname)
    const animate =
      direction !== null &&
      // A replace is a correction, not a journey — the redirects in App and the
      // auth guards all use one, and none should look like a screen.
      navigationType !== 'REPLACE' &&
      !reducedMotion() &&
      // A back the browser drove has already been drawn by the browser, and
      // drawing it again undoes it in front of the reader.
      (navigationType !== 'POP' || isAppNavigation())

    if (animate) {
      setLayers([from, next])
      setTransit(direction)
      setPendingScroll(null)
    } else {
      setLayers([next])
      setTransit(null)
      setPendingScroll(
        direction === 'push'
          ? 0
          : direction === 'pop'
            ? recallScroll(next.key)
            : null,
      )
    }
  }

  // The mark a back control leaves is only good for the render it was left
  // for; anything arriving after this is the browser's until told otherwise.
  useEffect(() => {
    clearAppNavigation()
  }, [location.key])

  // Before paint, so a screen arriving without an animation is never seen at
  // the wrong offset first. Keyed on `layers` as well as the offset itself,
  // because two pops in a row can want the same number.
  useLayoutEffect(() => {
    if (pendingScroll === null) return
    restoreScroll(pendingScroll)
  }, [layers, pendingScroll])

  const stackRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const nodes = useRef(new Map<string, HTMLDivElement>())

  const onSettled = useCallback((to: Layer) => {
    setLayers([to])
    setTransit(null)
  }, [])

  useScreenTransition({
    transit,
    layers,
    stackRef,
    scrimRef,
    nodes,
    onSettled,
  })

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
