/**
 * Saved-for-later persistence (separate from active cart).
 * Same versioned pattern as cart/storage.ts.
 */

import type { CartItem } from './context';

const STORAGE_KEY = 'sk.cart.saved.v1';

interface PersistedSaved {
  version: 1;
  updatedAt: string;
  items: CartItem[];
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readSaved(): CartItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedSaved;
    if (parsed.version !== 1 || !Array.isArray(parsed.items)) return [];
    return parsed.items;
  } catch {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    return [];
  }
}

export function writeSaved(items: CartItem[]): void {
  if (!isBrowser()) return;
  const payload: PersistedSaved = {
    version: 1,
    updatedAt: new Date().toISOString(),
    items,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode — silently ignore */
  }
}

export function clearSaved(): void {
  if (!isBrowser()) return;
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

export const SAVED_STORAGE_KEY = STORAGE_KEY;