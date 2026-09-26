'use client';

/**
 * Wishlist context (T1-6 fix).
 *
 * - Guest: localStorage only (existing lib/wishlist/storage.ts)
 * - Signed-in: server-backed via /me/wishlist endpoints
 * - On auth transition guest → user: merge localStorage into server
 *   once, then clear localStorage (DECISIONS.md Step-8.7 pattern,
 *   applied to wishlist).
 *
 * All hooks are safe to call from any client component that renders
 * under <WishlistProvider>. SSR-safe: state hydrates post-mount.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/context';
import {
  getAll as getLocalWishlist,
  add as addLocal,
  remove as removeLocal,
  clear as clearLocal,
  type WishlistEntry,
} from './storage';

// ── DTO (mirror apps/api/modules/crm/me.service.ts WishlistItemDto) ──
interface ApiWishlistItem {
  productId: string;
  slug: string;
  titleEn: string;
  titleBn: string;
  imageUrl: string | null;
  minPricePoisha: number;
  addedAt: string;
}

interface WishlistContextValue {
  items: WishlistEntry[];
  /** True once we've read the appropriate source (localStorage or API). */
  hydrated: boolean;
  /** True while a network mutation is in flight. */
  busy: boolean;
  /** Whether `productId` is currently wishlisted. */
  has: (productId: string) => boolean;
  /** Toggle wishlist for a given product (with pre-resolved snapshot). */
  toggle: (entry: WishlistEntry) => Promise<void>;
  /** Explicit add. */
  add: (entry: WishlistEntry) => Promise<void>;
  /** Explicit remove. */
  remove: (productId: string) => Promise<void>;
  /** Total count (for header badge). */
  count: number;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { signedIn, user, accessToken, loading: authLoading } = useAuth();
  const [items, setItemsState] = useState<WishlistEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const hydratedRef = useRef(false);
  const mergeAttemptedRef = useRef(false);

  // Local event listener for guest storage (keeps two tabs in sync)
  useEffect(() => {
    if (signedIn) return;
    const onChange = () => setItemsState(getLocalWishlist());
    window.addEventListener('skymart:wishlist-changed', onChange);
    return () => window.removeEventListener('skymart:wishlist-changed', onChange);
  }, [signedIn]);

  // Hydrate: guest → localStorage | user → API
  useEffect(() => {
    if (authLoading) return; // wait for auth to settle

    let cancelled = false;

    (async () => {
      if (!signedIn) {
        // Guest
        const local = getLocalWishlist();
        if (!cancelled) {
          setItemsState(local);
          setHydrated(true);
          hydratedRef.current = true;
        }
        return;
      }

      // Signed-in: merge once (guest local → server), then fetch server list
      try {
        if (!mergeAttemptedRef.current) {
          mergeAttemptedRef.current = true;
          const local = getLocalWishlist();
          if (local.length > 0) {
            await api.post<{ merged: number }>('/me/wishlist/merge', {
              items: local.map((e) => ({
                productId: e.productId,
                addedAt: e.addedAt,
              })),
            });
            // Only clear after a successful merge
            clearLocal();
          }
        }
        const serverItems = await api.get<ApiWishlistItem[]>('/me/wishlist');
        if (!cancelled) {
          setItemsState(serverItems.map(toLocalShape));
          setHydrated(true);
          hydratedRef.current = true;
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          // Token expired; fall back to local (auth will re-refresh)
          setItemsState(getLocalWishlist());
        } else {
          setItemsState([]);
        }
        setHydrated(true);
        hydratedRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signedIn, authLoading, accessToken]);

  const has = useCallback(
    (productId: string) => items.some((e) => e.productId === productId),
    [items],
  );

  const add = useCallback(
    async (entry: WishlistEntry) => {
      if (busy) return;

      // Optimistic update
      const prev = items;
      if (!prev.some((e) => e.productId === entry.productId)) {
        setItemsState([entry, ...prev]);
      }

      if (!signedIn) {
        // Guest path — persist to localStorage
        addLocal(entry);
        return;
      }

      // Signed-in path — server authoritative
      setBusy(true);
      try {
        await api.post('/me/wishlist', { productId: entry.productId });
      } catch (err) {
        // Rollback on failure
        setItemsState(prev);
        if (!(err instanceof ApiError)) throw err;
      } finally {
        setBusy(false);
      }
    },
    [busy, items, signedIn],
  );

  const remove = useCallback(
    async (productId: string) => {
      if (busy) return;
      const prev = items;
      setItemsState(prev.filter((e) => e.productId !== productId));

      if (!signedIn) {
        removeLocal(productId);
        return;
      }

      setBusy(true);
      try {
        await api.del(`/me/wishlist/${encodeURIComponent(productId)}`);
      } catch (err) {
        setItemsState(prev);
        if (!(err instanceof ApiError)) throw err;
      } finally {
        setBusy(false);
      }
    },
    [busy, items, signedIn],
  );

  const toggle = useCallback(
    async (entry: WishlistEntry) => {
      if (has(entry.productId)) {
        await remove(entry.productId);
      } else {
        await add(entry);
      }
    },
    [has, add, remove],
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      items,
      hydrated,
      busy,
      has,
      toggle,
      add,
      remove,
      count: items.length,
    }),
    [items, hydrated, busy, has, toggle, add, remove],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error('useWishlist must be used inside <WishlistProvider>');
  }
  return ctx;
}

// ── Adapters ──

/** API shape → UI shape (WishlistEntry). */
function toLocalShape(a: ApiWishlistItem): WishlistEntry {
  return {
    productId: a.productId,
    slug: a.slug,
    titleEn: a.titleEn,
    titleBn: a.titleBn,
    imageUrl: a.imageUrl,
    minPricePoisha: a.minPricePoisha,
    addedAt: a.addedAt,
  };
}