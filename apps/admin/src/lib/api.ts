'use client';

/**
 * Admin API client.
 *
 * - Access token is held in module-level memory (never localStorage — TDD §10.1).
 * - Refresh cookie is HttpOnly, set by API; sent automatically with `credentials: 'include'`.
 * - All errors normalized to `ApiError`.
 */

import { env } from './env';

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
  retryOn401?: boolean;
}

async function refreshAccessToken(): Promise<string | null> {
  // Coalesce concurrent refreshes
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${env.apiUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { accessToken?: string };
      accessToken = data.accessToken ?? null;
      return accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, skipAuth, retryOn401 = true, headers, ...rest } = options;

  const buildHeaders = (): HeadersInit => {
    const h: Record<string, string> = {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...((headers as Record<string, string>) ?? {}),
    };
    if (!skipAuth && accessToken) {
      h.Authorization = `Bearer ${accessToken}`;
    }
    return h;
  };

  const doFetch = async (): Promise<Response> =>
    fetch(`${env.apiUrl}${path}`, {
      ...rest,
      headers: buildHeaders(),
      credentials: 'include',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

  let res = await doFetch();

  // Silent refresh on 401, then retry once
  if (res.status === 401 && !skipAuth && retryOn401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await doFetch();
    }
  }

  // Parse response
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const err = json as { message?: string; code?: string; details?: unknown } | null;
    throw new ApiError(
      res.status,
      err?.code ?? 'UNKNOWN',
      err?.message ?? `Request failed with status ${res.status}`,
      err?.details,
    );
  }

  return json as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};

export { refreshAccessToken };