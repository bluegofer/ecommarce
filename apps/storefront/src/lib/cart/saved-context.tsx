'use client';

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
import type { CartItem } from './context';
import { readSaved, writeSaved, clearSaved } from './saved-storage';

interface SavedContextValue {
  items: CartItem[];
  hydrated: boolean;
  save: (item: CartItem) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  /** True if variantId currently in saved list. */
  isSaved: (variantId: string) => boolean;
}

const SavedContext = createContext<SavedContextValue | null>(null);

export function SavedProvider({ children }: { children: ReactNode }) {
  const [items, setItemsState] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    setItemsState(readSaved());
    setHydrated(true);
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    writeSaved(items);
  }, [items]);

  const save = useCallback((item: CartItem) => {
    setItemsState((prev) => {
      if (prev.some((x) => x.variantId === item.variantId)) return prev;
      return [...prev, item];
    });
  }, []);

  const remove = useCallback((variantId: string) => {
    setItemsState((prev) => prev.filter((x) => x.variantId !== variantId));
  }, []);

  const clear = useCallback(() => {
    setItemsState([]);
    clearSaved();
  }, []);

  const value = useMemo<SavedContextValue>(
    () => ({
      items,
      hydrated,
      save,
      remove,
      clear,
      isSaved: (variantId: string) => items.some((x) => x.variantId === variantId),
    }),
    [items, hydrated, save, remove, clear],
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved(): SavedContextValue {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error('useSaved must be used inside <SavedProvider>');
  return ctx;
}