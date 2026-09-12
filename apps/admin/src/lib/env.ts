/**
 * Environment config — typed, single source of truth.
 * NEXT_PUBLIC_* vars are baked into the client bundle at build time.
 */

function required(key: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing env var ${key}. Add it to apps/admin/.env.local (see .env.example).`,
    );
  }
  return value;
}

export const env = {
  apiUrl: required('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL),
} as const;