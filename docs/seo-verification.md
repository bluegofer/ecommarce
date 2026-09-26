# SEO Verification — Step 14 Evidence Pack

**Status:** COMPLETE — Step 14.1 → 14.6 verified locally (2026-09-14)
**TDD ref:** §8 · **UI Spec ref:** A9

## 1. Rendering Strategy

| Route | Strategy | Verified |
|---|---|---|
| `/` | ISR (revalidate 60) | ✅ |
| `/p/[slug]` | ISR (revalidate 3600) + generateStaticParams(100) | ✅ |
| `/c/[slug]` | Dynamic + generateStaticParams(50) | ✅ |
| `/deals` | ISR (revalidate 300) | ✅ |
| `/pages/[slug]` | ISR (revalidate 300) | ✅ |
| `/s` | Dynamic + noindex | ✅ |
| `/cart` `/checkout` `/account` `/order-confirmation` | Dynamic + noindex | ✅ |
| `/mock-gateway` | Dynamic + prod 404 | ✅ |

**On-demand revalidation:** `POST /api/revalidate` (secret-gated). Verified.

## 2. Structured Data

| Schema | Where | Verified |
|---|---|---|
| Organization | Root layout | ✅ |
| WebSite + SearchAction | Root layout | ✅ |
| Product | PDP | ✅ name/brand/sku/offers/availability/priceValidUntil/aggregateRating |
| BreadcrumbList | PDP + PLP | ✅ |
| FAQPage | /faq | ✅ 8 Q&A |

## 3. Canonical + hreflang

Every crawlable page emits canonical (absolute) + 3 hreflang
(bn, en, x-default → /bn per D-16). Verified on home, PDP, PLP.

## 4. Sitemap + robots

- `/sitemap.xml` — 50+ entries, bn+en per entry, hreflang alternates,
  image entries for products with primaryImageUrl. 200, application/xml.
- `/robots.txt` — disallow `/api/`, `/*/account`, `/*/cart`,
  `/*/checkout`, `/*/order-confirmation`, `/*/signin`, `/*/register`,
  `/*/mock-gateway`; sitemap + host pointers. Aggressive scrapers
  excluded.

## 5. Meta Tags (og:*)

PDP verified:
- og:title, og:url, og:image, og:image:alt, og:image:type,
  og:image:width (1200), og:image:height (630), og:type

## 6. Dynamic OG Images

- `/opengraph-image` — sitewide (200, image/png, 189 KB)
- `/bn/p/[slug]/opengraph-image` — per-product (200, image/png, 27 KB)
- `/bn/c/[slug]/opengraph-image` — per-category (200, image/png, 45 KB)

All via next/og ImageResponse on Edge runtime.

## 7. Image SEO

- width + height on img tags
- alt formula per UI Spec E2
- loading="lazy" below-the-fold
- next/image WebP
- remotePatterns tightened (localhost + S3 + CloudFront only)
- minimumCacheTTL 30 days

## 8. CWV Budget

Targets: LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms.
Manual checklist: `apps/storefront/scripts/seo-checklist.md`.
Production measurement deferred to Step 15 (staging + CloudFront).

## 9. Cloud-Level SEO — deferred to Step 15

- HTTPS via ACM (TDD §8.2)
- Custom domain via Route 53 (D-03, D-20 blocked — client)
- CloudFront CDN caching
- www → root canonical
- Search Console verification + sitemap ping
- Multi-AZ uptime

## 10. Deferred Items

- Rich Results Test — needs public URL
- Search Console — needs verified domain
- CWV field data — needs production traffic
- Slug 301 redirect admin UI — API exists (Step 3), UI deferred

## 11. Step 14 Files

**14.1** products.service/controller + storefront PDP + not-found +
revalidate route
**14.2** categories.service/controller + PLP + deals
**14.3** sitemap.ts + robots.ts
**14.4** lib/seo/json-ld.ts + layout.tsx + faq + PLP + home
**14.5** 3 × opengraph-image.tsx + next.config + ProductCard
**14.6** next.config (compress+headers) + layout preconnect +
[locale]/layout hreflang + this doc + scripts/seo-checklist.md

## Conclusion

Step 14 implementation-complete and locally verified. Production
verification lands in Step 15 (AWS infra + DNS + CWV field data).