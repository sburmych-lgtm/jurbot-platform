import { useState, useEffect, useCallback } from 'react';
import { api, type ApiResponse } from './api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(path: string, options?: { skip?: boolean }) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: !options?.skip,
    error: null,
  });

  const fetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res: ApiResponse<T> = await api.get<T>(path);
      if (res.success && res.data) {
        setState({ data: res.data, loading: false, error: null });
      } else {
        setState({ data: null, loading: false, error: res.error ?? 'Request failed' });
      }
    } catch (err) {
      setState({ data: null, loading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }, [path]);

  useEffect(() => {
    if (!options?.skip) {
      fetch();
    }
  }, [fetch, options?.skip]);

  return { ...state, refetch: fetch };
}
