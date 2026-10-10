// Root-level 404 — required so any notFound() outside a specific segment
// has a place to render. Kept minimal; the [locale] variant is preferred.
import Link from 'next/link';

export default function RootNotFound() {
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
      <h1 style={{ fontSize: 24, margin: '12px 0' }}>Page not found</h1>
      <p style={{ color: '#64748B', marginBottom: 24 }}>
        The page you are looking for does not exist.
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
        Go to Home
      </Link>
    </main>
  );
}