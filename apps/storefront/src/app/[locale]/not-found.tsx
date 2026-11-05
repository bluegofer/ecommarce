// Locale-scoped 404 — keeps the error inside the [locale] segment so
// notFound() from any nested page renders branded content instead of
// bubbling up to the root layout.
import Link from 'next/link';

export default function LocaleNotFound() {
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
      <div style={{ fontSize: 64, fontWeight: 700, color: '#87CEEB' }}>404</div>
      <h1 style={{ fontSize: 24, margin: '12px 0' }}>
        Page not found / পৃষ্ঠাটি খুঁজে পাওয়া যায়নি
      </h1>
      <p style={{ color: '#64748B', marginBottom: 24 }}>
        The link may be broken or the page may have been removed.
        <br />
        লিংকটি ভুল হতে পারে অথবা পৃষ্ঠাটি সরিয়ে ফেলা হয়েছে।
      </p>
      <Link
        href="/bn"
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          background: '#FFC533',
          color: '#0C2B3D',
          textDecoration: 'none',
          borderRadius: 8,
          fontWeight: 600,
        }}
      >
        Go to Home / হোমে যান
      </Link>
    </main>
  );
}