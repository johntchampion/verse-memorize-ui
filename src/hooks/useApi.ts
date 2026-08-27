import { useCallback, useEffect, useRef, useState } from 'react';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
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

  return {
    data: settled?.data ?? null,
    loading,
    error: loading ? null : (settled?.error ?? null),
    refetch,
  };
}
