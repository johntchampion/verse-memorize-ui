/**
 * Motion preference, read at the moment it matters rather than subscribed to.
 * The stylesheet's blanket rule handles anything expressed as a CSS duration;
 * this is for the parts that can't be — a deliberate pause between two states,
 * or an animation JavaScript has to schedule itself.
 */
export const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A deliberate pause, and nothing at all when motion is reduced. A hold exists
 * to give an animation room to land, so with no animation to land there is
 * nothing left to wait for.
 */
export const hold = (ms: number) =>
  new Promise<void>((resolve) => {
    if (reducedMotion()) {
      resolve()
      return
    }
    setTimeout(resolve, ms)
  })
