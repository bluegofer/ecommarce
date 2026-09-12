'use client';

const KEY = 'skymart:wishlist:v1';

export interface WishlistEntry {
  productId: string;
  slug: string;
  titleEn: string;
  titleBn: string;
  imageUrl: string | null;
  minPricePoisha: number;
  addedAt: string;
}

type Store = WishlistEntry[];

function read(): Store {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : [];
  } catch {
    return [];
  }
}

function write(items: Store): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('skymart:wishlist-changed'));
  } catch {
    /* quota */
  }
}

export function getAll(): Store {
  return read();
}

export function has(productId: string): boolean {
  return read().some((e) => e.productId === productId);
}

export function add(entry: WishlistEntry): void {
  const items = read();
  if (items.some((e) => e.productId === entry.productId)) return;
  items.unshift(entry);
  write(items);
}

export function remove(productId: string): void {
  write(read().filter((e) => e.productId !== productId));
}

export function clear(): void {
  write([]);
}

export function count(): number {
  return read().length;
}