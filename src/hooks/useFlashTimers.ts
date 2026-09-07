import { useEffect, useRef } from 'react'

export const WRONG_FLASH_MS = 400

/** Timeouts that must not outlive the component that scheduled them. */
export function useFlashTimers() {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  return (fn: () => void, ms = WRONG_FLASH_MS) => {
    timers.current.push(setTimeout(fn, ms))
  }
}
