# SEO Manual Verification Checklist

Run on **production build** (`pnpm build && pnpm start`), not dev mode.

## Prerequisites

    cd apps/storefront
    pnpm build
    pnpm start   # http://localhost:3000

## 1. Lighthouse (Chrome DevTools)

DevTools → Lighthouse → Mobile → Performance + SEO + Best Practices.

**Budgets (TDD §8.1):**
- LCP ≤ 2.5s · CLS ≤ 0.1 · INP ≤ 200ms
- Performance ≥ 85 · SEO ≥ 95 · Best Practices ≥ 90

**Pages:** `/bn`, `/bn/c/electronics`, `/bn/p/placeholder-chef-knife-8in`, `/bn/deals`, `/bn/pages/about`

## 2. Rich Results Test

https://search.google.com/test/rich-results

- `/bn` → Organization + WebSite
- `/bn/p/...` → Product + BreadcrumbList + Offer
- `/bn/faq` → FAQPage
- `/bn/c/electronics` → BreadcrumbList

## 3. Rendered HTML (view-source)

- [ ] `<link rel="canonical">` absolute URL
- [ ] `<link rel="alternate" hreflang="bn|en|x-default">`
- [ ] `<meta property="og:image">` 1200×630
- [ ] `<script type="application/ld+json">` present
- [ ] Full SSR content in curl (not empty div)

## 4. Sitemap + robots

- [ ] `/sitemap.xml` valid XML, absolute URLs, hreflang alternates
- [ ] `/robots.txt` sitemap pointer + disallow rules
- [ ] Both carry `Cache-Control`

## 5. Image SEO

- [ ] `<img>` has width + height (no CLS)
- [ ] alt text per UI Spec E2 formula
- [ ] `loading="lazy"` below-the-fold
- [ ] LCP image preloaded
- [ ] WebP via next/image