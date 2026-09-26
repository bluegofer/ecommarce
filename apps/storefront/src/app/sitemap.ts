// Step 14.3 — Dynamic XML sitemap (TDD §8.1).
// Generated at request time from the live catalog + CMS; cached by Next.js
// with `revalidate`. Includes hreflang alternates (bn default + en + x-default).
import type { MetadataRoute } from 'next';
import { catalogApi } from '@/lib/api';

export const revalidate = 3600; // refresh hourly

const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nolimitshopping.com';
const LOCALES = ['bn', 'en'] as const;

/** Static, crawlable routes — one entry per locale. */
const STATIC_PATHS: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = [
  { path: '', changeFrequency: 'daily', priority: 1.0 },
  { path: '/deals', changeFrequency: 'daily', priority: 0.9 },
  { path: '/pages/about', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/pages/contact', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/pages/faq', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/pages/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/pages/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/pages/returns', changeFrequency: 'yearly', priority: 0.3 },
];

function alternates(path: string): Record<string, string> {
  const langs: Record<string, string> = {};
  for (const l of LOCALES) langs[l] = `${ORIGIN}/${l}${path}`;
  langs['x-default'] = `${ORIGIN}/bn${path}`;
  return langs;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Static pages
  for (const sp of STATIC_PATHS) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${ORIGIN}/${locale}${sp.path}`,
        lastModified: new Date(),
        changeFrequency: sp.changeFrequency,
        priority: sp.priority,
        alternates: { languages: alternates(sp.path) },
      });
    }
  }

  // Products (top-N by soldCount)
  try {
    const products = await catalogApi.getSitemapProducts(1000);
    for (const p of products) {
      const path = `/p/${p.slug}`;
      for (const locale of LOCALES) {
        entries.push({
          url: `${ORIGIN}/${locale}${path}`,
          lastModified: new Date(p.updatedAt),
          changeFrequency: 'weekly',
          priority: 0.8,
          ...(p.primaryImageUrl ? { images: [p.primaryImageUrl] } : {}),
          alternates: { languages: alternates(path) },
        });
      }
    }
  } catch {
    /* API unreachable — still emit static + category entries */
  }

  // Categories
  try {
    const categories = await catalogApi.getSitemapCategories();
    for (const c of categories) {
      const path = `/c/${c.slug}`;
      for (const locale of LOCALES) {
        entries.push({
          url: `${ORIGIN}/${locale}${path}`,
          lastModified: new Date(c.updatedAt),
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: { languages: alternates(path) },
        });
      }
    }
  } catch {
    /* API unreachable */
  }

  return entries;
}