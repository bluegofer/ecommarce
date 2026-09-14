import { notFound } from 'next/navigation';
import { getDictionary, isLocale } from '@/lib/i18n';
import { catalogApi } from '@/lib/api';
import type { CategoryNode } from '@/lib/api/types';
import { Header, Footer, Breadcrumbs, AnnouncementBar } from '@/components/layout';
import { PlpClient } from '@/components/plp';

// Step 14.2 — split rendering strategy:
//   - Top-N categories (no filters) → ISR, prebuilt at build time
//   - Any category with active filters → dynamic SSR + noindex (A9)
// Next.js gives us `searchParams` on the server; we make the *page* dynamic
// only when filters are present by comparing searchParams at runtime. Since
// Next cannot conditionally set dynamic/ISR per-request, we keep the page
// force-dynamic but seed top categories via `generateStaticParams` so the
// initial unfiltered request is served from cache in production CDN.
//
// NOTE: keeping `dynamic = 'force-dynamic'` for correctness of filtered views;
// the ISR win comes from CDN caching of the same path when unfiltered.
export const dynamic = 'force-dynamic';

/**
 * Step 14.2 — prebuild top-N category slugs. Combined with CDN caching this
 * makes unfiltered PLP loads fast while keeping filtered variants dynamic.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const rows = await catalogApi.getStaticCategorySlugs(50);
    return rows.map((r) => ({ slug: r.slug }));
  } catch {
    return [];
  }
}

interface PageProps {
  params: { locale: string; slug: string };
  searchParams: Record<string, string | string[] | undefined>;
}

/** Find a category node (and its parent chain) by slug in the tree. */
function findPath(
  nodes: CategoryNode[],
  slug: string,
  ancestors: CategoryNode[] = [],
): { node: CategoryNode; path: CategoryNode[] } | null {
  for (const node of nodes) {
    const path = [...ancestors, node];
    if (node.slug === slug) return { node, path };
    if (node.children.length > 0) {
      const found = findPath(node.children, slug, path);
      if (found) return found;
    }
  }
  return null;
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as 'bn' | 'en';
  const t = getDictionary(locale);

  // Read filters from searchParams
  const brand = stringParam(searchParams.brand);
  const minPrice = numberParam(searchParams.minPrice);
  const maxPrice = numberParam(searchParams.maxPrice);
  const minRating = numberParam(searchParams.minRating);
  const discount = numberParam(searchParams.discount);
  const sort = (stringParam(searchParams.sort) ?? 'relevance') as
    | 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating' | 'best_sellers';
  const page = numberParam(searchParams.page) ?? 1;

  // Fetch category tree + search results
  const [categories, results, recommended] = await Promise.all([
    catalogApi.getCategoryTree().catch(() => [] as CategoryNode[]),
    catalogApi
      .searchProducts({
        categorySlug: params.slug,
        brand,
        minPricePoisha: minPrice,
        maxPricePoisha: maxPrice,
        minRating,
        sort,
        page,
        pageSize: 48,
      })
      .catch(() => emptySearch()),
    catalogApi
      .listProducts({ status: 'PUBLISHED', sort: 'best_sellers', limit: 6 })
      .catch(() => ({ items: [], total: 0, page: 1, pageSize: 6, totalPages: 1 })),
  ]);

  const found = findPath(categories, params.slug);
  if (!found) notFound();

  const categoryName = locale === 'bn' ? found.node.nameBn : found.node.nameEn;
  const crumbItems = [
    { label: locale === 'bn' ? 'হোম' : 'Home', href: `/${locale}` },
    ...found.path.slice(0, -1).map((c) => ({
      label: locale === 'bn' ? c.nameBn : c.nameEn,
      href: `/${locale}/c/${c.slug}`,
    })),
    { label: categoryName },
  ];

  return (
    <>
      <AnnouncementBar
        message={
          locale === 'bn'
            ? '১,৫০০ টাকার উপরে ফ্রি ডেলিভারি — শুধু এই সপ্তাহ'
            : 'Free delivery over ৳1,500 — this week only'
        }
        ctaLabel={locale === 'bn' ? 'অফার দেখুন' : 'See deals'}
        ctaHref={`/${locale}/deals`}
        locale={locale}
      />
      <Header
        locale={locale}
        labels={headerLabels(t, locale)}
        navLinks={navLinks(t, locale)}
        categories={categories.map((c) => ({
          id: c.id,
          label: locale === 'bn' ? c.nameBn : c.nameEn,
          href: `/${locale}/c/${c.slug}`,
          children: c.children.map((ch) => ({
            id: ch.id,
            label: locale === 'bn' ? ch.nameBn : ch.nameEn,
            href: `/${locale}/c/${ch.slug}`,
          })),
        }))}
        alternateLocaleHref={`/${locale === 'bn' ? 'en' : 'bn'}`}
      />

      <main id="main" style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 24px 48px' }}>
        <h1 className="visually-hidden">{categoryName}</h1>
        <Breadcrumbs items={crumbItems} locale={locale} />
        <PlpClient
          initial={results}
          heading={categoryName}
          recommended={recommended.items}
          locale={locale}
          dict={t}
        />
      </main>

      <Footer
        locale={locale}
        labels={footerLabels(t)}
        columns={footerColumns(t, locale)}
      />
    </>
  );
}

// ── Helpers ──

function emptySearch() {
  return {
    items: [],
    total: 0,
    page: 1,
    pageSize: 48,
    totalPages: 1,
    facets: { brands: [], categories: [], ratings: [], priceRanges: [], attributes: {} },
  };
}

function stringParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function numberParam(v: string | string[] | undefined): number | undefined {
  const s = stringParam(v);
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function headerLabels(t: ReturnType<typeof getDictionary>, locale: 'bn' | 'en') {
  return {
    deliverTo: t['header.deliver_to'],
    deliverPlaceholder: locale === 'bn' ? 'ঢাকা ১২১২' : 'Dhaka 1212',
    searchPlaceholder: t['search.placeholder'],
    searchAll: t['nav.all'],
    searchIn: `SEARCH FOR {q} IN {category}`,
    helloSignIn: t['auth.signin'],
    accountLists: t['header.account'],
    returns: locale === 'bn' ? 'রিটার্ন' : 'Returns',
    orders: t['header.orders'],
    cart: t['header.cart'],
    languageBn: 'বাংলা',
    languageEn: 'EN',
    megaMenu: {
      greeting: t['auth.signin'],
      trending: 'Trending',
      bestSellers: t['nav.best'],
      newReleases: t['nav.new'],
      todayDeals: t['nav.deals'],
      shopByCategory: 'Shop by Category',
      helpServices: 'Help & Services',
      customerService: 'Customer Service',
      languageSwitch: locale === 'bn' ? 'English' : 'বাংলা',
      empty: 'No categories yet',
      back: 'Back',
      mainMenu: 'Main Menu',
    },
  };
}

function navLinks(t: ReturnType<typeof getDictionary>, locale: 'bn' | 'en') {
  return [
    { label: t['nav.deals'], href: `/${locale}/deals` },
    { label: t['nav.best'], href: `/${locale}/c/electronics` },
    { label: t['nav.new'], href: `/${locale}/c/electronics` },
    { label: 'Electronics', href: `/${locale}/c/electronics` },
    { label: 'Fashion', href: `/${locale}/c/fashion` },
    { label: 'Home & Kitchen', href: `/${locale}/c/home-kitchen` },
  ];
}

function footerLabels(t: ReturnType<typeof getDictionary>) {
  return {
    backTop: t['common.back_top'],
    about: t['footer.about'],
    contact: t['footer.contact'],
    faq: t['footer.faq'],
    privacy: t['footer.privacy'],
    terms: t['footer.terms'],
    returns: t['footer.returns'],
    language: 'Language',
    currency: 'Currency',
    country: 'Country',
    brand: 'SkyMart',
  };
}

function footerColumns(t: ReturnType<typeof getDictionary>, locale: 'bn' | 'en') {
  return [
    { heading: t['footer.about'], links: [
      { label: 'About', href: `/${locale}/pages/about` },
      { label: 'Careers', href: `/${locale}/pages/careers` },
    ]},
    { heading: 'Help', links: [
      { label: t['footer.contact'], href: `/${locale}/pages/contact` },
      { label: t['footer.faq'], href: `/${locale}/pages/faq` },
    ]},
    { heading: 'Policies', links: [
      { label: t['footer.privacy'], href: `/${locale}/pages/privacy` },
      { label: t['footer.terms'], href: `/${locale}/pages/terms` },
      { label: t['footer.returns'], href: `/${locale}/pages/returns` },
    ]},
    { heading: 'Account', links: [
      { label: t['account.title'], href: `/${locale}/account` },
      { label: t['header.orders'], href: `/${locale}/account/orders` },
    ]},
  ];
}