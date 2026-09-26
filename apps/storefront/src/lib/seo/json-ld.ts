// apps/storefront/src/lib/seo/json-ld.ts
//
// Step 14.4 — shared JSON-LD builders used across the storefront.
// Step 15.9.1 — centralized on BRAND (F-14, F-16) + fixed website name field.

import { BRAND } from '@/lib/brand';

const ORIGIN = BRAND.url;

export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND.name,
    url: ORIGIN,
    logo: `${ORIGIN}${BRAND.icons.logo}`,
    sameAs: [] as string[],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        areaServed: 'BD',
        availableLanguage: [...BRAND.locales.supported],
        email: BRAND.supportEmail,
      },
    ],
  };
}

export function websiteJsonLd(locale: 'bn' | 'en'): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND.name,
    url: `${ORIGIN}/${locale}`,
    inLanguage: locale === 'bn' ? 'bn-BD' : 'en-US',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${ORIGIN}/${locale}/s?k={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqJsonLd(items: FaqItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: it.answer,
      },
    })),
  };
}

export function breadcrumbJsonLd(
  items: Array<{ label: string; href?: string }>,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.label,
      ...(item.href ? { item: `${ORIGIN}${item.href}` } : {}),
    })),
  };
}

export { ORIGIN };