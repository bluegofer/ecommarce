'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description: string | undefined;
}

interface ToastContextValue {
  push: (t: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON: Record<ToastTone, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const TONE_CLASSES: Record<ToastTone, string> = {
  success: 'border-success-200 bg-success-50 text-success-700',
  error: 'border-danger-200 bg-danger-50 text-danger-700',
  warning: 'border-warning-200 bg-warning-50 text-warning-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => remove(id), 5000);
    },
    [remove],
  );

  const success = useCallback(
    (title: string, description?: string) =>
      push({ tone: 'success', title, description: description ?? undefined }),
    [push],
  );
  const error = useCallback(
    (title: string, description?: string) =>
      push({ tone: 'error', title, description: description ?? undefined }),
    [push],
  );

  return (
    <ToastContext.Provider value={{ push, success, error }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[340px] max-w-[90vw]"
      >
        {toasts.map((t) => {
          const Icon = TONE_ICON[t.tone];
          return (
            <div
              key={t.id}
              className={cn(
                'flex items-start gap-3 p-3.5 rounded-lg border shadow-md bg-white',
                TONE_CLASSES[t.tone],
              )}
            >
              <Icon className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t.title}</p>
                {t.description && (
                  <p className="text-[12.5px] mt-0.5 opacity-90">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="p-1 rounded hover:bg-black/5"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}