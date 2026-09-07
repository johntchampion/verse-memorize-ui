import { useEffect, useRef } from 'react'

/** The newest value, readable from handlers that outlive the render that made
    them — without making them a dependency that re-registers those handlers. */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  })
  return ref
}
