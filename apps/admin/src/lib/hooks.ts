'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from './api';

interface UseQueryOptions {
  /** Skip automatically refetching (e.g. for modals not yet visible) */
  enabled?: boolean;
  /** Refetch interval in ms */
  refreshInterval?: number;
  /** Deps that trigger a refetch when they change */
  deps?: unknown[];
}

interface UseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

export function useQuery<T>(
  path: string | null,
  options: UseQueryOptions = {},
): UseQueryResult<T> {
  const { enabled = true, refreshInterval, deps = [] } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled && !!path);
  const [error, setError] = useState<ApiError | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchNow = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<T>(path);
      if (mounted.current) setData(result);
    } catch (e) {
      if (mounted.current)
        setError(e instanceof ApiError ? e : new ApiError(0, 'NETWORK', String(e)));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    if (!enabled || !path) return;
    void fetchNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, path, ...deps]);

  useEffect(() => {
    if (!refreshInterval || !enabled || !path) return;
    const id = setInterval(() => void fetchNow(), refreshInterval);
    return () => clearInterval(id);
  }, [refreshInterval, enabled, path, fetchNow]);

  return { data, loading, error, refetch: fetchNow };
}

interface UseMutationResult<TInput, TOutput> {
  mutate: (input: TInput) => Promise<TOutput>;
  loading: boolean;
  error: ApiError | null;
}

export function useMutation<TInput, TOutput = unknown>(
  method: 'post' | 'patch' | 'put' | 'delete',
  path: string | ((input: TInput) => string),
): UseMutationResult<TInput, TOutput> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const mutate = useCallback(
    async (input: TInput): Promise<TOutput> => {
      setLoading(true);
      setError(null);
      try {
        const url = typeof path === 'function' ? path(input) : path;
        const result =
          method === 'delete'
            ? await api.delete<TOutput>(url)
            : await api[method]<TOutput>(url, input);
        return result;
      } catch (e) {
        const apiErr = e instanceof ApiError ? e : new ApiError(0, 'NETWORK', String(e));
        setError(apiErr);
        throw apiErr;
      } finally {
        setLoading(false);
      }
    },
    [method, path],
  );

  return { mutate, loading, error };
}

/**
 * Upload a single File to a multipart endpoint. Same loading/error shape as
 * useMutation so admin pages can render consistently.
 * Added in Step 17 for CMS media upload; reusable for any future file upload
 * (product images, popups, banners).
 */
export function useUpload<T = unknown>(
  path: string,
): {
  upload: (file: File, fieldName?: string) => Promise<T>;
  loading: boolean;
  error: ApiError | null;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const upload = useCallback(
    async (file: File, fieldName = 'file'): Promise<T> => {
      setLoading(true);
      setError(null);
      try {
        const fd = new FormData();
        fd.append(fieldName, file);
        return await api.upload<T>(path, fd);
      } catch (e) {
        const apiErr = e instanceof ApiError ? e : new ApiError(0, 'NETWORK', String(e));
        setError(apiErr);
        throw apiErr;
      } finally {
        setLoading(false);
      }
    },
    [path],
  );

  return { upload, loading, error };
}