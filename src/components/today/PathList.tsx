import { useEffect, useRef, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import type { PathNode } from '../../lib/path'
import { Skeleton } from '../Skeleton'

/**
 * How much of each end of the scroller the mask has already begun to dissolve.
 * A stop sitting inside this band is on screen but half faded, so it counts as
 * out of view — see `.path-scroll` in index.css, which these match.
 */
const FADE = 30

/** A stop, in whichever of the three states it is in. */
function Stop({
  node,
  ref,
}: {
  node: PathNode
  ref?: RefObject<HTMLAnchorElement | null>
}) {
  const body = (
    <>
      <span className='path-mark' aria-hidden='true'>
        {node.state === 'done' ? '✓' : node.index + 1}
      </span>
      <span className='path-text'>
        <span className='path-ref'>{node.reference}</span>
        <span className='path-meta'>{node.meta}</span>
      </span>
      {node.state === 'current' && (
        <span className='path-pill'>
          {node.index === 0 ? 'Start here' : 'You’re here'}
        </span>
      )}
    </>
  )

  // Only the next stop is a way in. The ones behind are spent and the ones
  // ahead aren't reachable yet — the path is walked in order.
  if (node.state === 'current') {
    return (
      <Link
        ref={ref}
        to='/session'
        className='path-row path-row-current'
        aria-label={`Continue with ${node.reference} — ${node.meta}`}
      >
        {body}
      </Link>
    )
  }
  return <div className={`path-row path-row-${node.state}`}>{body}</div>
}

/** A stand-in of the same shape, so the path doesn't shift when it lands. */
function PathSkeleton() {
  return (
    <div className='path-scroll'>
      <div className='path-list' aria-hidden='true'>
        <span className='path-group'>
          <Skeleton w={112} h={10} />
        </span>
        {[0, 1, 2, 3].map((i) => (
          <div className='path-row' key={i}>
            <Skeleton variant='circle' w={56} h={56} />
            <span className='path-text'>
              <Skeleton variant='text' w={132} h={15} />
              <Skeleton variant='text' w={84} h={11} />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Today's stops, drawn down a single rail: what's been done, where you are,
 * and what's still ahead. The rail turns solid gold once the whole path is
 * behind you.
 *
 * This is the only part of the screen that scrolls — the heading above and the
 * button below hold their places — and a day far enough along that the live
 * stop starts off screen scrolls itself to it.
 */
export default function PathList({
  nodes,
  complete,
}: {
  nodes: PathNode[] | null
  complete: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const currentRef = useRef<HTMLAnchorElement>(null)
  const currentIndex = nodes
    ? nodes.findIndex((node) => node.state === 'current')
    : -1

  useEffect(() => {
    const scroller = scrollRef.current
    const row = currentRef.current
    if (!scroller || !row) return

    const view = scroller.getBoundingClientRect()
    const box = row.getBoundingClientRect()
    if (box.top >= view.top + FADE && box.bottom <= view.bottom - FADE) return

    // Centred rather than just-barely-in: the stop being arrived at should read
    // as the subject of the screen, not as something that scraped into it.
    scroller.scrollTop += box.top - view.top - (view.height - box.height) / 2
  }, [currentIndex])

  if (!nodes) return <PathSkeleton />
  // Nothing due and nothing in a slot — there is no path to draw, and the
  // heading above has already said so.
  if (nodes.length === 0) return null

  return (
    <div className='path-scroll' ref={scrollRef}>
      <div className={complete ? 'path-list path-list-complete' : 'path-list'}>
        {nodes.map((node) => (
          <div className='path-step' key={node.index}>
            {node.group && <span className='path-group'>{node.group}</span>}
            <Stop
              node={node}
              ref={node.state === 'current' ? currentRef : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
