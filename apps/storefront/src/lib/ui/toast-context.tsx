'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastInput {
  /** Icon kind for the visual. */
  kind?: 'success' | 'error' | 'info';
  /** Bold primary line (e.g. "Added to cart"). */
  title: string;
  /** Optional secondary line. */
  description?: string;
  /** Optional thumbnail URL (48px). */
  thumbnailUrl?: string | null;
  /** Optional action button (e.g. Undo, View cart). */
  action?: ToastAction;
  /** Auto-dismiss duration ms; default 5000 per UI Spec B5. */
  durationMs?: number;
}

export interface ToastInstance extends ToastInput {
  id: string;
}

interface ToastContextValue {
  /** Currently visible toasts (bottom-left on desktop). */
  toasts: ToastInstance[];
  /** Show a toast; returns its id. */
  show: (input: ToastInput) => string;
  /** Dismiss a toast by id. */
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastInstance[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (input: ToastInput): string => {
      counter += 1;
      const id = `t${Date.now()}-${counter}`;
      const instance: ToastInstance = { ...input, id };

      setToasts((prev) => {
        // Cap at 3 concurrent toasts
        const next = [...prev, instance];
        return next.length > 3 ? next.slice(next.length - 3) : next;
      });

      const duration = input.durationMs ?? 5000;
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(() => ({ toasts, show, dismiss }), [toasts, show, dismiss]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}