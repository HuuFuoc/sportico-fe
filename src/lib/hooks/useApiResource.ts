"use client";

import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

export interface ApiResourceState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export interface ApiResource<T> extends ApiResourceState<T> {
  /** Re-run the fetcher (e.g. from an error-state "Retry" button). */
  refetch: () => void;
}

/**
 * Tiny client-side loader for `api.*` calls. Handles loading/error state,
 * ignores results from stale or unmounted renders, and re-runs when `deps`
 * change or `refetch()` is called.
 *
 * Deliberately NOT SWR / React Query — neither is installed, and the brief asks
 * us not to add one. Use it from Client Components only:
 *
 *   const { data, loading, error, refetch } =
 *     useApiResource(() => api.fetchCoaches(), []);
 */
export function useApiResource<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList = [],
): ApiResource<T> {
  const [state, setState] = useState<ApiResourceState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const [reloadToken, setReloadToken] = useState(0);

  // Always invoke the latest fetcher without making it an effect dependency.
  // The ref is updated in an effect (never during render) and read only inside
  // the data effect below, so a fresh inline `fetcher` each render is harmless.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, error: null });
    fetcherRef
      .current()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (active) {
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      });
    return () => {
      active = false;
    };
    // `deps` is caller-controlled; `reloadToken` drives manual refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken]);

  const refetch = useCallback(() => setReloadToken((n) => n + 1), []);

  return { ...state, refetch };
}
