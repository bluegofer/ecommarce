'use client';

/**
 * Cart context — guest cart in localStorage, ready to merge into a user cart
 * on login (Step 8 wires the merge API call; the hook is exposed here).
 *
 * CartItem is UI-first (thumbnail, slug, snapshot fields) and is a superset
 * of the API CartItemDTO (see @ecommarce/types). Mapping happens in Step 8.
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
import { readCart, writeCart, clearCart } from './storage';

export interface CartItem {
  /** Server variant id when known; guest lines use a client-side id. */
  variantId: string;
  /** Product slug for /p/[slug] links. */
  slug: string;
  /** Display name (locale-resolved). */
  title: string;
  /** Absolute or relative image URL; falls back to placeholder. */
  thumbnailUrl: string | null;
  /** Variant summary line — "Color: Blue · Size: M" style. */
  variantLabel: string | null;
  /** Unit price in poisha (integer, TDD §11.4). */
  unitPricePoisha: number;
  /** Quantity (>= 1). */
  qty: number;
  /** Stock available at add-to-cart time (for UI warnings). */
  stockAvailable: number;
  /** Display-only: seller/brand name if provided. */
  sellerName?: string | null;
}

export interface CartContextValue {
  items: CartItem[];
  /** Total number of units across all lines (for badge). */
  unitCount: number;
  /** Sum of unitPricePoisha * qty (integer poisha). */
  subtotalPoisha: number;
  /** True once localStorage has been read on the client. */
  hydrated: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQty: (variantId: string, qty: number) => void;
  clear: () => void;
  /** Replaces entire cart (used for guest→user merge in Step 8). */
  setItems: (items: CartItem[]) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItemsState] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);
  // Tracks whether we've ever had a non-empty cart in this session. Used to
  // prevent StrictMode's double-effect from clobbering localStorage during
  // the initial mount.
  const hasHadItemsRef = useRef(false);

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    setItemsState(readCart());
    setHydrated(true);
    hydratedRef.current = true;
  }, []);

  // Persist on change. Guard: don't write an empty cart during the initial
  // StrictMode double-mount (which would clobber localStorage before readCart
  // has a chance to populate). Only persist once items are non-empty, OR once
  // we've had a real non-empty cart and user removed everything.
  useEffect(() => {
    if (!hydratedRef.current) return;
    // Allow writing empty cart only if we've previously had items
    if (items.length === 0 && !hasHadItemsRef.current) return;
    if (items.length > 0) hasHadItemsRef.current = true;
    writeCart(items);
  }, [items]);

  const addItem = useCallback((item: CartItem) => {
    setItemsState((prev) => {
      const existing = prev.find((x) => x.variantId === item.variantId);
      if (existing) {
        return prev.map((x) =>
          x.variantId === item.variantId
            ? { ...x, qty: Math.min(x.qty + item.qty, x.stockAvailable) }
            : x,
        );
      }
      return [...prev, { ...item, qty: Math.max(1, item.qty) }];
    });
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setItemsState((prev) => prev.filter((x) => x.variantId !== variantId));
  }, []);

  const updateQty = useCallback((variantId: string, qty: number) => {
    setItemsState((prev) =>
      prev
        .map((x) =>
          x.variantId === variantId
            ? { ...x, qty: Math.max(0, Math.min(qty, x.stockAvailable)) }
            : x,
        )
        .filter((x) => x.qty > 0),
    );
  }, []);

  const clear = useCallback(() => {
    setItemsState([]);
    clearCart();
  }, []);

  const setItems = useCallback((next: CartItem[]) => {
    setItemsState(next);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const unitCount = items.reduce((sum, x) => sum + x.qty, 0);
    const subtotalPoisha = items.reduce((sum, x) => sum + x.unitPricePoisha * x.qty, 0);
    return {
      items,
      unitCount,
      subtotalPoisha,
      hydrated,
      addItem,
      removeItem,
      updateQty,
      clear,
      setItems,
    };
  }, [items, hydrated, addItem, removeItem, updateQty, clear, setItems]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used inside <CartProvider>');
  }
  return ctx;
}