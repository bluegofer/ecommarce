/**
 * Typed fetch wrapper for the BlueGofer API.
 * Base URL comes from NEXT_PUBLIC_API_URL (dev default: local NestJS).
 * All responses are JSON; errors throw ApiError with status + parsed body.
 *
 * Usage:
 *   const page = await api.get<PaginatedResponse<ProductDTO>>('/catalog/products?page=1');
 *   const order = await api.post<OrderDTO>('/orders', body, { idempotencyKey });
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly url: string;

  constructor(status: number, body: unknown, url: string) {
    super(
      typeof body === 'object' && body && 'message' in body
        ? String((body as { message: unknown }).message)
        : `API error ${status}`,
    );
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

export interface RequestOptions {
  /** Extra headers merged over defaults. */
  headers?: Record<string, string>;
  /** Abort signal for cancellation. */
  signal?: AbortSignal;
  /** Idempotency-Key header (order/payment endpoints per TDD §11.2). */
  idempotencyKey?: string;
  /** Skip JSON.stringify (e.g. FormData upload). */
  rawBody?: boolean;
  /** Cache mode for fetch. */
  cache?: RequestCache;
}

function buildHeaders(options?: RequestOptions): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options?.headers,
  };
  if (!options?.rawBody) {
    headers['Content-Type'] = 'application/json';
  }
  if (options?.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }
  return headers;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const init: RequestInit = {
    method,
    headers: buildHeaders(options),
    signal: options?.signal,
    cache: options?.cache,
    credentials: 'include', // HttpOnly refresh cookie for authed endpoints
  };
  if (body !== undefined) {
    init.body = options?.rawBody ? (body as BodyInit) : JSON.stringify(body);
  }

  const res = await fetch(url, init);

  // 204 No Content
  if (res.status === 204) {
    if (!res.ok) throw new ApiError(res.status, null, url);
    return undefined as T;
  }

  const text = await res.text();
  const parsed: unknown = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, parsed, url);
  }
  return parsed as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, body, options),
  del: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
};