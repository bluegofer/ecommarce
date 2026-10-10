/**
 * Auth storage — deliberately minimal.
 *
 * Per docs/DECISIONS.md ("Step 8 Update — Storefront Auth Token Storage"):
 *   - Access tokens live ONLY in memory (AuthProvider React state).
 *   - Refresh tokens live in HttpOnly SameSite cookies set by the API.
 *   - This module ONLY persists a non-sensitive hint: was the user signed in
 *     at last visit? Used to decide whether to attempt a silent /auth/refresh
 *     on next mount (avoids one network round-trip for anonymous users).
 *
 * NEVER store JWT access or refresh tokens here. Doing so would break the
 * TDD §10.1 XSS model.
 */

const HINT_KEY = 'sk.auth.hint.v1';

interface PersistedHint {
  version: 1;
  signedInAt: string; // ISO timestamp
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** Read the "was signed in last visit?" hint. Returns null if never set. */
export function readAuthHint(): { signedInAt: string } | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(HINT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedHint;
    if (parsed.version !== 1 || typeof parsed.signedInAt !== 'string') return null;
    return { signedInAt: parsed.signedInAt };
  } catch {
    try { window.localStorage.removeItem(HINT_KEY); } catch { /* noop */ }
    return null;
  }
}

/** Mark that the user has just signed in. */
export function writeAuthHint(): void {
  if (!isBrowser()) return;
  const payload: PersistedHint = { version: 1, signedInAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(HINT_KEY, JSON.stringify(payload));
  } catch { /* quota / private mode — ignore */ }
}

/** Clear the hint (on explicit sign-out). */
export function clearAuthHint(): void {
  if (!isBrowser()) return;
  try { window.localStorage.removeItem(HINT_KEY); } catch { /* noop */ }
}

export const AUTH_HINT_KEY = HINT_KEY;