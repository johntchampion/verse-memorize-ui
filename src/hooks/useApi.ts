import { useCallback, useEffect, useRef, useState } from 'react';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  /**
   * The first load only — true until data has ever arrived. A refetch after a
   * mutation leaves this false, so a screen already showing content never
   * falls back to placeholders. This, not `loading`, is what a skeleton keys
   * off.
   */
  pending: boolean;
  error: string | null;
  refetch: () => void;
}

interface Settled<T> {
  tick: number;
  data: T | null;
  error: string | null;
}

/**
 * Fetch-on-mount with loading/error state. Screens re-fetch on mount;
 * `refetch` covers refreshes after mutations. `loading` is derived:
 * true until a result for the current tick has settled.
 */
export function useApi<T>(fetcher: () => Promise<T>): ApiState<T> {
  const [tick, setTick] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  // Callers pass inline arrow functions; the latest one is kept in a ref
  // (synced in an effect) so the fetch effect keys off `tick` alone.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let cancelled = false;

    fetcherRef
      .current()
      .then((data) => {
        if (!cancelled) setSettled({ tick, data, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSettled({
            tick,
            data: null,
            error: err instanceof Error ? err.message : 'Something went wrong',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  const loading = settled === null || settled.tick !== tick;
  const data = settled?.data ?? null;

  return {
    data,
    loading,
    pending: loading && data === null,
    error: loading ? null : (settled?.error ?? null),
    refetch,
  };
}

/**
 * Merges the sources a screen needs before it can show anything. Not a hook —
 * it just reads the states it is handed, so it can be called with however many
 * a screen happens to have.
 *
 * The merged `error` is the first one reported. A screen that can survive one
 * of its sources failing should leave that source out of the error it passes on
 * and use `combineApi` only for `pending` and `refetch`.
 */
export function combineApi(...states: ApiState<unknown>[]) {
  return {
    pending: states.some((s) => s.pending),
    error: states.find((s) => s.error !== null)?.error ?? null,
    refetch: () => {
      for (const state of states) state.refetch();
    },
  };
}
