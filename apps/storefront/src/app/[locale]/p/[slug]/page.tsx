import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDictionary, isLocale } from '@/lib/i18n';
import { api, catalogApi } from '@/lib/api';
import type { CategoryNode, ProductSummary } from '@/lib/api/types';
import { Header, Footer, Breadcrumbs, AnnouncementBar } from '@/components/layout';
import { PdpClient, type PdpVariant, type PdpImage } from '@/components/pdp';

// PDP fetches product + variants + reviews per request — dynamic for now.
// Step 11 (SEO) may switch to ISR with generateStaticParams for popular slugs.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { locale: string; slug: string };
}

interface ReviewsSummary {
  avgRating: number;
  totalCount: number;
  histogram: Record<'1' | '2' | '3' | '4' | '5', number>;
}

interface ReviewsList {
  items: {
    id: string;
    authorName?: string;
    customerName?: string;
    rating: number;
    title: string;
    body: string;
    createdAt: string;
    verifiedPurchase?: boolean;
  }[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!isLocale(params.locale)) return {};
  const locale = params.locale;
  try {
    const p = await catalogApi.getProductBySlug(params.slug);
    const title = p.metaTitle ?? (locale === 'bn' ? p.titleBn : p.titleEn);
    const description = p.metaDescription ?? undefined;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
      },
    };
  } catch {
    return {};
  }
}

export default async function ProductPage({ params }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as 'bn' | 'en';
  const t = getDictionary(locale);

  // Fetch product + variants + reviews + related in parallel
  let product: ProductSummary;
  try {
    product = await catalogApi.getProductBySlug(params.slug);
  } catch {
    notFound();
  }

  const [variants, reviewsSummary, reviewsList, categories, related] = await Promise.all([
    catalogApi.getVariantsForProduct(product.id).catch(() => [] as PdpVariant[]),
    fetchReviewsSummary(product.id).catch(() => ({ avgRating: 0, totalCount: 0, histogram: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } as ReviewsSummary['histogram'] })),
    fetchReviewsList(product.id).catch(() => ({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 })),
    catalogApi.getCategoryTree().catch(() => [] as CategoryNode[]),
    catalogApi
      .listProducts({ categoryId: product.categoryId, status: 'PUBLISHED', limit: 8 })
      .then((r) => ({ ...r, items: r.items.filter((x) => x.id !== product.id) }))
      .catch(() => ({ items: [], total: 0, page: 1, pageSize: 8, totalPages: 1 })),
  ]);

  // Build gallery images: product media (via primaryImageUrl or variant media)
  // The API currently doesn't return media per product explicitly, so we fallback
  // to a placeholder. Step 9 admin will surface media array.
  const images: PdpImage[] = product.primaryImageUrl
    ? [{ url: product.primaryImageUrl, altText: locale === 'bn' ? product.titleBn : product.titleEn }]
    : [];

  // Bullets and specs
  const bullets: string[] = Array.isArray(product.bulletFeatures)
    ? (product.bulletFeatures as string[])
    : [];
  const specs: { key: string; value: string }[] =
    product.specsJson && typeof product.specsJson === 'object'
      ? Object.entries(product.specsJson as Record<string, unknown>).map(([k, v]) => ({
          key: k,
          value: String(v),
        }))
      : [];

  const descriptionHtml =
    (locale === 'bn' ? product.descriptionBn : product.descriptionEn) ??
    (locale === 'bn' ? 'বিবরণ শীঘ্রই আসছে।' : 'Description coming soon.');

  // Build review histogram rows: API returns {1:.., 5:..} object
  const histogramRows = (['5', '4', '3', '2', '1'] as const).map((stars) => ({
    stars: Number(stars) as 5 | 4 | 3 | 2 | 1,
    count: reviewsSummary.histogram[stars] ?? 0,
  }));

  // Breadcrumb — find category path
  const found = findCategoryPath(categories, product.categoryId);
  const crumbItems = [
    { label: locale === 'bn' ? 'হোম' : 'Home', href: `/${locale}` },
    ...(found?.path ?? []).map((c) => ({
      label: locale === 'bn' ? c.nameBn : c.nameEn,
      href: `/${locale}/c/${c.slug}`,
    })),
    { label: locale === 'bn' ? product.titleBn : product.titleEn },
  ];

  // Related products (same category) — reuse ProductGrid-compatible shape
  const relatedItems = related.items.slice(0, 8);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildProductJsonLd(product, variants, locale, reviewsSummary)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildBreadcrumbJsonLd(crumbItems)),
        }}
      />
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
        <h1 className="visually-hidden">
          {locale === 'bn' ? product.titleBn : product.titleEn}
        </h1>
        <Breadcrumbs items={crumbItems} locale={locale} />

        <PdpClient
          productId={product.id}
          slug={product.slug}
          title={locale === 'bn' ? product.titleBn : product.titleEn}
          brand={product.brand}
          sellerName={product.brand}
          images={images}
          variants={variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            pricePoisha: v.pricePoisha,
            compareAtPoisha: v.compareAtPoisha,
            stock: v.stock,
            attributeValues: v.attributeValues,
          }))}
          bulletFeatures={bullets}
          descriptionHtml={descriptionHtml}
          specs={specs}
          ratingAverage={Number(product.avgRating)}
          ratingCount={product.ratingCount}
          reviews={{
            summary: {
              average: Number(reviewsSummary.avgRating) || Number(product.avgRating),
              count: reviewsSummary.totalCount || product.ratingCount,
              histogram: histogramRows,
            },
            items: reviewsList.items.map((r) => ({
              id: r.id,
              authorName: r.authorName ?? r.customerName ?? 'Anonymous',
              rating: r.rating,
              title: r.title,
              body: r.body,
              createdAt: r.createdAt,
              verified: Boolean(r.verifiedPurchase),
            })),
          }}
          isNew={
            Boolean(product.publishedAt) &&
            Date.now() - new Date(product.publishedAt!).getTime() < 30 * 24 * 60 * 60 * 1000
          }
          bestSeller={product.soldCount > 3000}
          locale={locale}
          dict={t}
        />

        {relatedItems.length > 0 ? (
          <section style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--sk-divider)' }}>
            <h2
              style={{
                fontFamily: 'var(--sk-font-en)',
                fontSize: 20,
                fontWeight: 600,
                color: 'var(--sk-ink)',
                margin: '0 0 16px',
              }}
            >
              {locale === 'bn' ? 'এই পণ্যগুলোও দেখুন' : 'Related products'}
            </h2>
            {/* Simple server-rendered grid (reuses ProductCard via ProductGrid) */}
            <ServerRelatedGrid
              products={relatedItems}
              locale={locale}
              dict={t}
            />
          </section>
        ) : null}
      </main>

      <Footer
        locale={locale}
        labels={footerLabels(t)}
        columns={footerColumns(t, locale)}
      />
    </>
  );
}

/** Minimal server-side grid — Client ProductCard handles its own interactivity. */
function ServerRelatedGrid({
  products,
  locale,
  dict,
}: {
  products: ProductSummary[];
  locale: 'bn' | 'en';
  dict: ReturnType<typeof getDictionary>;
}) {
  // Reuse ProductGrid — it's a server-compatible component (no hooks)
  const { ProductGrid } = require('@/components/plp') as typeof import('@/components/plp');
  return <ProductGrid products={products} locale={locale} dict={dict} />;
}

// ── Reviews fetchers ──

async function fetchReviewsSummary(productId: string): Promise<ReviewsSummary> {
  return api.get<ReviewsSummary>(`/reviews/summary/${encodeURIComponent(productId)}`);
}

async function fetchReviewsList(productId: string): Promise<ReviewsList> {
  return api.get<ReviewsList>(`/reviews?productId=${encodeURIComponent(productId)}&limit=5`);
}

// ── JSON-LD builders ──

function buildProductJsonLd(
  p: ProductSummary,
  variants: PdpVariant[],
  locale: 'bn' | 'en',
  reviews: ReviewsSummary,
) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://skymart.example';
  const inStockVariant = variants.find((v) => v.stock > 0) ?? variants[0];
  const pricePoisha = inStockVariant?.pricePoisha ?? 0;
  const priceBDT = (pricePoisha / 100).toFixed(2);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: locale === 'bn' ? p.titleBn : p.titleEn,
    description: (locale === 'bn' ? p.descriptionBn : p.descriptionEn) ?? undefined,
    brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
    sku: inStockVariant?.sku ?? undefined,
    url: `${origin}/${locale}/p/${p.slug}`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BDT',
      price: priceBDT,
      availability:
        (inStockVariant?.stock ?? 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: `${origin}/${locale}/p/${p.slug}`,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    },
    aggregateRating:
      reviews.totalCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: Number(reviews.avgRating).toFixed(1),
            reviewCount: reviews.totalCount,
          }
        : undefined,
  };
}

function buildBreadcrumbJsonLd(items: { label: string; href?: string }[]) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://skymart.example';
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.label,
      ...(item.href ? { item: `${origin}${item.href}` } : {}),
    })),
  };
}

// ── Category tree search ──

function findCategoryPath(
  nodes: CategoryNode[],
  categoryId: string,
  ancestors: CategoryNode[] = [],
): { node: CategoryNode; path: CategoryNode[] } | null {
  for (const node of nodes) {
    const path = [...ancestors, node];
    if (node.id === categoryId) return { node, path };
    if (node.children.length > 0) {
      const found = findCategoryPath(node.children, categoryId, path);
      if (found) return found;
    }
  }
  return null;
}

// ── Shared layout helpers (duplicated from [slug] and /s for now; Step 8.10 extracts) ──

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