'use client';

// Root-level fallback — catches errors thrown inside the root layout
// itself. Next.js requires this file to include its own <html> and <body>
// tags because the root layout has crashed at this point.
//
// Minimal, dependency-free styling (inline only) — the crashed root may
// not have loaded global CSS yet.

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[global-error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: 'Inter, system-ui, sans-serif',
          background: '#F8FAFC',
          color: '#0F172A',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <main
          style={{
            maxWidth: 640,
            padding: '0 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 64, fontWeight: 700, color: '#D62828' }}>
            500
          </div>
          <h1 style={{ fontSize: 24, margin: '12px 0' }}>
            Something went wrong / কিছু একটা ভুল হয়েছে
          </h1>
          <p style={{ color: '#64748B', marginBottom: 24 }}>
            A critical error stopped the app from loading.
            <br />
            একটি গুরুতর সমস্যা অ্যাপটি লোড হতে বাধা দিয়েছে।
          </p>

          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                background: '#FFC533',
                color: '#0C2B3D',
                border: 'none',
                textDecoration: 'none',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Try again / আবার চেষ্টা করুন
            </button>
            <a
              href="/bn"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                background: 'transparent',
                color: '#164561',
                border: '1px solid #164561',
                textDecoration: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Go to Home / হোমে যান
            </a>
          </div>

          {error.digest ? (
            <p
              style={{
                color: '#94A3B8',
                fontSize: 12,
                marginTop: 32,
                fontFamily: 'monospace',
              }}
            >
              Error ID: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}