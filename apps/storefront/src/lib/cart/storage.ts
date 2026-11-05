/**
 * Guest cart persistence in localStorage.
 * Versioned schema so we can migrate safely if CartItem changes.
 * SSR-safe: all functions no-op when `window` is undefined.
 */

import type { CartItem } from './context';

const STORAGE_KEY = 'sk.cart.v1';

interface PersistedCart {
  version: 1;
  updatedAt: string; // ISO timestamp
  items: CartItem[];
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readCart(): CartItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedCart;
    if (parsed.version !== 1 || !Array.isArray(parsed.items)) return [];
    return parsed.items;
  } catch {
    // Corrupt storage — clear and start fresh
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    return [];
  }
}

export function writeCart(items: CartItem[]): void {
  if (!isBrowser()) return;
  const payload: PersistedCart = {
    version: 1,
    updatedAt: new Date().toISOString(),
    items,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota exceeded or private mode — fail silently, cart still works in-memory
  }
}

export function clearCart(): void {
  if (!isBrowser()) return;
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

/** Storage key — exposed for tests / debugging. */
export const CART_STORAGE_KEY = STORAGE_KEY;