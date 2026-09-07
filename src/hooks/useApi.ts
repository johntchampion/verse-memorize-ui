import { useCallback, useEffect, useRef, useState } from 'react'
import { messageOf } from '../lib/errors'

export interface ApiState<T> {
  data: T | null
  loading: boolean
  /** True until data has ever arrived — a refetch leaves it false, so a screen
      already showing content never falls back to placeholders. Skeletons key
      off this, not `loading`. */
  pending: boolean
  error: string | null
  refetch: () => void
}

interface Settled<T> {
  tick: number
  data: T | null
  error: string | null
}

/** Fetch-on-mount; `refetch` covers refreshes after mutations. */
export function useApi<T>(fetcher: () => Promise<T>): ApiState<T> {
  const [tick, setTick] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)

  // Callers pass inline arrow functions, so the latest goes in a ref and the
  // fetch effect keys off `tick` alone.
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  useEffect(() => {
    let cancelled = false

    fetcherRef
      .current()
      .then((data) => {
        if (!cancelled) setSettled({ tick, data, error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSettled({
            tick,
            data: null,
            error: messageOf(err, 'Something went wrong'),
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [tick])

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  const loading = settled === null || settled.tick !== tick
  const data = settled?.data ?? null

  return {
    data,
    loading,
    pending: loading && data === null,
    error: loading ? null : (settled?.error ?? null),
    refetch,
  }
}

/**
 * Merges the sources a screen needs before it can show anything. A screen that
 * can survive one source failing should leave that source out of the error it
 * passes on and use only `pending` and `refetch` from here.
 */
export function combineApi(...states: ApiState<unknown>[]) {
  return {
    pending: states.some((s) => s.pending),
    error: states.find((s) => s.error !== null)?.error ?? null,
    refetch: () => {
      for (const state of states) state.refetch()
    },
  }
}
