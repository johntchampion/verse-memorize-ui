/**
 * A spring, small enough to read in one sitting.
 *
 * Semi-implicit Euler at a fixed sub-step — the same integrator the animation
 * libraries use, so their tension/friction numbers mean the same thing here.
 * The point of a spring over a CSS transition is interruption: a spring already
 * in flight carries its velocity into whatever you ask for next, so a finger can
 * catch a closing sheet and throw it back open without anything snapping.
 */

export interface SpringConfig {
  tension: number
  friction: number
  mass: number
  /** Stop the moment the target is reached instead of easing into it. */
  clamp?: boolean
}

/**
 * Settling home. Damping ratio ~0.74, so it overshoots by ~3% of however far
 * it had to travel — a real bounce on a full-height entrance, and nothing you
 * can see when a 30px pull springs back. That proportionality is the whole
 * reason to run a spring instead of a fixed curve.
 */
export const SETTLE: SpringConfig = { tension: 220, friction: 22, mass: 1 }

/**
 * Leaving. Stiffer and still slightly underdamped, so the exit takes about
 * 250ms however tall the sheet is; whatever it overshoots by is off-screen.
 */
export const CLOSE: SpringConfig = {
  tension: 320,
  friction: 30,
  mass: 1,
  // Once the panel is off the bottom of the screen there is nothing left to
  // watch: land on the target and be done, rather than spending another
  // hundred milliseconds converging on it out of sight.
  clamp: true,
}

/**
 * Close enough to home, and slow enough, to call it done (px and px/s). Both
 * loose enough that the spring stops rather than crawling the last pixel —
 * an asymptote is invisible on screen but keeps the sheet mounted.
 */
const REST_OFFSET = 0.5
const REST_VELOCITY = 8

/** One integration step; small enough that stiff configs stay stable. */
const STEP_MS = 1000 / 120

/** A backgrounded tab hands back a huge delta — don't integrate all of it. */
const MAX_FRAME_MS = 64

export interface Spring {
  /** Jump straight to a value and kill any motion — one drag frame. */
  set: (value: number) => void
  /**
   * Animate to `target`. Velocity is px/s and defaults to the velocity the
   * spring already has, so re-targeting mid-flight stays continuous.
   */
  to: (target: number, velocity?: number, config?: SpringConfig) => void
  stop: () => void
  readonly value: number
  readonly moving: boolean
}

export function createSpring(
  onFrame: (value: number) => void,
  onRest?: () => void,
): Spring {
  let value = 0
  let velocity = 0
  let target = 0
  let config = SETTLE
  let raf = 0
  let prev = 0
  /** Which way this run is travelling, for `clamp` to recognise arrival. */
  let heading = 0
  // Time left over from the last frame, carried into the next one so the
  // simulation runs at the same rate on any display.
  let carry = 0

  const stop = () => {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    carry = 0
  }

  const step = (now: number) => {
    raf = 0
    carry += Math.min(now - prev, MAX_FRAME_MS)
    prev = now

    let arrived = false
    while (carry >= STEP_MS) {
      carry -= STEP_MS
      const dt = STEP_MS / 1000
      const force =
        -config.tension * (value - target) - config.friction * velocity
      velocity += (force / config.mass) * dt
      value += velocity * dt
      if (config.clamp && (value - target) * heading >= 0) {
        arrived = true
        break
      }
    }

    if (
      arrived ||
      (Math.abs(value - target) < REST_OFFSET &&
        Math.abs(velocity) < REST_VELOCITY)
    ) {
      value = target
      velocity = 0
      carry = 0
      onFrame(value)
      onRest?.()
      return
    }

    onFrame(value)
    raf = requestAnimationFrame(step)
  }

  return {
    set(next) {
      stop()
      value = next
      velocity = 0
      onFrame(value)
    },
    to(next, nextVelocity = velocity, nextConfig = SETTLE) {
      heading = Math.sign(next - value) || 1
      target = next
      velocity = nextVelocity
      config = nextConfig
      if (raf) return
      prev = performance.now()
      carry = 0
      raf = requestAnimationFrame(step)
    },
    stop,
    get value() {
      return value
    },
    get moving() {
      return raf !== 0
    },
  }
}
