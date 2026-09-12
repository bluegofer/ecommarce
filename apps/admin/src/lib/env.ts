/**
 * Environment config — typed, single source of truth.
 *
 * NEXT_PUBLIC_* vars are baked into the client bundle at build time.
 * We do NOT throw at module load: Next.js prerenders pages, so a missing
 * env var must not crash the build. Validation happens on first API call.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

if (
  typeof process !== 'undefined' &&
  process.env.NODE_ENV === 'production' &&
  !process.env.NEXT_PUBLIC_API_URL &&
  typeof window !== 'undefined'
) {
  // Browser-only warning: server prerender is fine with the default.
  // eslint-disable-next-line no-console
  console.warn(
    '[env] NEXT_PUBLIC_API_URL is not set — falling back to http://localhost:3000',
  );
}

export const env = {
  apiUrl: API_URL,
} as const;