export const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** A pause, skipped entirely when there is no animation left to wait on. */
export const hold = (ms: number) =>
  new Promise<void>((resolve) => {
    if (reducedMotion()) {
      resolve()
      return
    }
    setTimeout(resolve, ms)
  })
