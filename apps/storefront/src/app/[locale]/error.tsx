'use client';

// Locale-scoped error boundary — Next.js requires this to be a Client
// Component. Catches runtime errors thrown inside any nested [locale]
// page (except errors in the segment's own layout.tsx, which bubble to
// the global-error.tsx at the root).
//
// Bilingual copy in the same style as not-found.tsx (no i18n dict
// dependency — errors can occur before/without dictionary context).

import { useEffect } from 'react';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to Sentry (already initialized in instrumentation.ts).
    // console.error also runs — CloudWatch / browser devtools capture it.
    // eslint-disable-next-line no-console
    console.error('[locale/error]', error);
  }, [error]);

  return (
    <main
      style={{
        maxWidth: 640,
        margin: '80px auto',
        padding: '0 24px',
        textAlign: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ fontSize: 64, fontWeight: 700, color: '#D62828' }}>
        500
      </div>
      <h1 style={{ fontSize: 24, margin: '12px 0' }}>
        Something went wrong / কিছু একটা ভুল হয়েছে
      </h1>
      <p style={{ color: '#64748B', marginBottom: 24 }}>
        We hit an unexpected error. Please try again — or head back home.
        <br />
        একটি অপ্রত্যাশিত সমস্যা হয়েছে। আবার চেষ্টা করুন — অথবা হোমে ফিরে যান।
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
  );
}