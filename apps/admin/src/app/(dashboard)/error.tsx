'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[dashboard error boundary]', error);
  }, [error]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
          <p className="text-sm text-slate-500 mt-1">
            The page hit an unexpected error. This has been logged.
          </p>
        </div>

        <div className="rounded border border-danger-200 bg-danger-50 p-3">
          <p className="font-mono text-[12.5px] text-danger-700 break-all">
            {error.message || 'Unknown error'}
          </p>
          {error.digest && (
            <p className="font-mono text-[11px] text-danger-600 mt-1">
              digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="h-9 px-4 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            Try again
          </button>
          <a
            href="/"
            className="h-9 px-4 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}