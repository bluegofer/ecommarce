// Step 14.3 — robots.txt via Next.js `robots.ts` (TDD §8.1).
// UI Spec A9: account, cart, checkout, order-confirmation are noindex.
// Auth-gated and internal routes are disallowed entirely.
import type { MetadataRoute } from 'next';

const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://skymart.example';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/*/account',
          '/*/account/',
          '/*/cart',
          '/*/checkout',
          '/*/order-confirmation',
          '/*/signin',
          '/*/register',
          '/*/mock-gateway',
        ],
      },
      // Block aggressive scrapers on expensive endpoints
      {
        userAgent: ['AhrefsBot', 'SemrushBot', 'MJ12bot'],
        disallow: ['/*/s', '/*/c/', '/api/'],
      },
    ],
    sitemap: `${ORIGIN}/sitemap.xml`,
    host: ORIGIN,
  };
}