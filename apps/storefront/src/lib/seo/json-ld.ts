// Step 14.4 — shared JSON-LD builders used across the storefront.
const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://skymart.example';

export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SkyMart',
    url: ORIGIN,
    logo: `${ORIGIN}/icons/icon.svg`,
    sameAs: [] as string[],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        areaServed: 'BD',
        availableLanguage: ['bn', 'en'],
      },
    ],
  };
}

export function websiteJsonLd(locale: 'bn' | 'en'): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SkyMart',
    url: `${ORIGIN}/${locale}`,
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