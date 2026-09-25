import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDictionary, isLocale } from '@/lib/i18n';
import { catalogApi, cmsApi } from '@/lib/api';
import { Header, Footer, Breadcrumbs, AnnouncementBar } from '@/components/layout';
import {
  HeroCarousel,
  CategoryTiles,
  DealStrip,
  ProductCarousel,
  PromoBanners,
  SeoTextBlock,
  type HeroSlide,
} from '@/components/home';
import type { CategoryNode, ProductSummary } from '@/lib/api/types';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  if (!isLocale(params.locale)) return {};
  const locale = params.locale as 'bn' | 'en';
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nolimitshopping.com';
  const canonical = `${origin}/${locale}`;

  const title =
    locale === 'bn'
      ? 'ব্লু-গোফার — অনলাইনে কেনাকাটা'
      : 'BlueGofer — Online Shopping in Bangladesh';
  const description =
    locale === 'bn'
      ? 'ইলেকট্রনিক্স, ফ্যাশন, হোম ও কিচেন সহ সব পণ্য এক জায়গায়। নিরাপদ পেমেন্ট, দ্রুত ডেলিভারি।'
      : 'Electronics, Fashion, Home & Kitchen and more. Safe payments, fast delivery across Bangladesh.';

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        bn: `${origin}/bn`,
        en: `${origin}/en`,
        'x-default': `${origin}/bn`,
      },
    },
    openGraph: { title, description, type: 'website', url: canonical },
  };
}

export default async function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as 'bn' | 'en';
  const t = getDictionary(locale);

  const [feed, categories, bestSellers, newArrivals, recommended, headerMenu, footerMenu] =
    await Promise.all([
      cmsApi.getHomeFeed().catch(() => ({ announcements: [], sections: [], activeFlashSales: [], activePopups: [] })),
      catalogApi.getCategoryTree().catch(() => [] as CategoryNode[]),
      catalogApi.listProducts({ status: 'PUBLISHED', sort: 'best_sellers', limit: 10 }).catch(() => ({ items: [], total: 0, page: 1, pageSize: 24, totalPages: 1 })),
      catalogApi.listProducts({ status: 'PUBLISHED', sort: 'newest', limit: 10 }).catch(() => ({ items: [], total: 0, page: 1, pageSize: 24, totalPages: 1 })),
      catalogApi.listProducts({ status: 'PUBLISHED', sort: 'rating', limit: 10 }).catch(() => ({ items: [], total: 0, page: 1, pageSize: 24, totalPages: 1 })),
      cmsApi.getMenu('HEADER').catch(() => null),
      cmsApi.getMenu('FOOTER').catch(() => null),
    ]);

  const sortedSections = [...feed.sections].sort((a, b) => a.position - b.position);
  const activeAnnouncement = feed.announcements[0];

  // ── Header nav links ──
  const cmsNavLinks =
    headerMenu && headerMenu.items.length > 0
      ? headerMenu.items
          .filter((it) => it.isActive)
          .map((it) => ({
            label: locale === 'bn' ? it.labelBn : it.labelEn,
            href: it.url.startsWith('http') ? it.url : `/${locale}${it.url}`,
          }))
      : null;

  const navLinks = cmsNavLinks ?? [
    { label: t['nav.deals'], href: `/${locale}/deals` },
    { label: t['nav.best'], href: `/${locale}/c/electronics` },
    { label: t['nav.new'], href: `/${locale}/c/electronics` },
    { label: 'Electronics', href: `/${locale}/c/electronics` },
    { label: 'Fashion', href: `/${locale}/c/fashion` },
    { label: 'Home & Kitchen', href: `/${locale}/c/home-kitchen` },
  ];

  // ── Footer columns ──
  const cmsFooterColumns =
    footerMenu && footerMenu.items.length > 0
      ? [
          {
            heading: locale === 'bn' ? 'দ্রুত লিংক' : 'Quick Links',
            links: footerMenu.items
              .filter((it) => it.isActive)
              .map((it) => ({
                label: locale === 'bn' ? it.labelBn : it.labelEn,
                href: it.url.startsWith('http') ? it.url : `/${locale}${it.url}`,
              })),
          },
        ]
      : null;

  const footerColumns = cmsFooterColumns ?? [
    { heading: t['footer.about'], links: [
      { label: 'About', href: `/${locale}/pages/about-us` },
      { label: 'Careers', href: `/${locale}/pages/about-us` },
    ]},
    { heading: 'Help', links: [
      { label: t['footer.contact'], href: `/${locale}/pages/contact` },
      { label: t['footer.faq'], href: `/${locale}/pages/faq` },
    ]},
    { heading: 'Policies', links: [
      { label: t['footer.privacy'], href: `/${locale}/pages/privacy-policy` },
      { label: t['footer.terms'], href: `/${locale}/pages/terms-of-service` },
      { label: t['footer.returns'], href: `/${locale}/pages/refund-policy` },
    ]},
    { heading: 'Account', links: [
      { label: t['account.title'], href: `/${locale}/account` },
      { label: t['header.orders'], href: `/${locale}/account/orders` },
    ]},
  ];

  return (
    <>
      <a href="#main" className="skipLink">Skip to content</a>
      {activeAnnouncement ? (
        <AnnouncementBar
          message={locale === 'bn' ? activeAnnouncement.textBn : activeAnnouncement.textEn}
          ctaHref={activeAnnouncement.linkUrl ?? undefined}
          ctaLabel={activeAnnouncement.linkUrl ? (locale === 'bn' ? 'অফার দেখুন' : 'See deals') : undefined}
          locale={locale}
        />
      ) : null}
      <Header
        locale={locale}
        labels={{
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
        }}
        navLinks={navLinks}
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
        <Breadcrumbs items={[{ label: 'Home' }]} locale={locale} />

        <h1 className="visually-hidden">
          {locale === 'bn' ? 'ব্লু-গোফার — অনলাইনে কেনাকাটা' : 'BlueGofer — Shop Online in Bangladesh'}
        </h1>

        {sortedSections.map((section) => renderSection({
          section,
          locale,
          categories,
          bestSellers: bestSellers.items,
          newArrivals: newArrivals.items,
          recommended: recommended.items,
          dict: t,
        }))}
      </main>

      <Footer
        locale={locale}
        labels={{
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
          brand: 'BlueGofer',
        }}
        columns={footerColumns}
      />
    </>
  );
}

// ── Section renderer ──
interface RenderSectionArgs {
  section: {
    id: string;
    key: string;
    sectionType: string;
    titleEn: string | null;
    titleBn: string | null;
    config: Record<string, unknown> | null;
    startsAt: string | null;
    endsAt: string | null;
  };
  locale: 'bn' | 'en';
  categories: CategoryNode[];
  bestSellers: ProductSummary[];
  newArrivals: ProductSummary[];
  recommended: ProductSummary[];
  dict: ReturnType<typeof getDictionary>;
}

function renderSection({
  section,
  locale,
  categories,
  bestSellers,
  recommended,
  dict,
}: RenderSectionArgs) {
  const title = locale === 'bn'
    ? section.titleBn ?? section.titleEn ?? undefined
    : section.titleEn ?? section.titleBn ?? undefined;

  switch (section.sectionType) {
    case 'HERO_CAROUSEL': {
      const slides = extractHeroSlides(section.config);
      if (slides.length === 0) return null;
      return <HeroCarousel key={section.id} slides={slides} locale={locale} autoplayMs={6000} />;
    }
    case 'DEAL_STRIP': {
      const dealEndsAt = extractDealEndsAt(section.config) ?? defaultDealEnd();
      return (
        <DealStrip
          key={section.id}
          endsAtIso={dealEndsAt}
          label={title ?? (locale === 'bn' ? "আজকের অফার শেষ হচ্ছে" : "Today's Deals end in")}
          ctaLabel={locale === 'bn' ? 'সব দেখুন →' : 'See all deals →'}
          ctaHref={`/${locale}/deals`}
          locale={locale}
        />
      );
    }
    case 'PROMO_TILES':
    case 'PROMO_BANNER': {
      const banners = extractPromoBanners(section.config, locale);
      if (banners.length === 0) return null;
      return <PromoBanners key={section.id} banners={banners} locale={locale} />;
    }
    case 'CATEGORY_TILES': {
      const selectedIds = extractCategoryIds(section.config);
      const shownCategories =
        selectedIds.length > 0
          ? categories.filter((c) => selectedIds.includes(c.id))
          : categories;
      if (shownCategories.length === 0) return null;
      return (
        <CategoryTiles
          key={section.id}
          categories={shownCategories}
          locale={locale}
          limit={4}
        />
      );
    }
    case 'PRODUCT_CAROUSEL': {
      if (bestSellers.length === 0) return null;
      return (
        <ProductCarousel
          key={section.id}
          title={title ?? (locale === 'bn' ? 'বেস্ট সেলার' : 'Best Sellers')}
          seeAllHref={`/${locale}/deals`}
          seeAllLabel={locale === 'bn' ? 'সব দেখুন →' : 'See all →'}
          products={bestSellers}
          locale={locale}
          dict={dict}
        />
      );
    }
    case 'RECOMMENDED': {
      if (recommended.length === 0) return null;
      return (
        <ProductCarousel
          key={section.id}
          title={title ?? (locale === 'bn' ? 'আপনার জন্য সুপারিশ' : 'Recommended for you')}
          seeAllHref={`/${locale}/deals`}
          seeAllLabel={locale === 'bn' ? 'সব দেখুন →' : 'See all →'}
          products={recommended}
          locale={locale}
          dict={dict}
        />
      );
    }
    case 'WIDE_BANNER': {
      const banners = extractWideBanners(section.config, locale);
      if (banners.length === 0) return null;
      return <PromoBanners key={section.id} banners={banners} locale={locale} />;
    }
    case 'SEO_TEXT': {
      const paragraphs = extractSeoParagraphs(section.config, locale);
      if (paragraphs.length === 0) return null;
      return (
        <SeoTextBlock
          key={section.id}
          title={title ?? (locale === 'bn' ? 'ব্লু-গোফারে অনলাইনে কিনুন' : 'Shop online at BlueGofer')}
          paragraphs={paragraphs}
          seeMoreLabel={locale === 'bn' ? 'আরো দেখুন' : 'See more'}
          seeLessLabel={locale === 'bn' ? 'কম দেখুন' : 'See less'}
        />
      );
    }
    default:
      return null;
  }
}

// ── Extractors ──

function extractHeroSlides(config: Record<string, unknown> | null | undefined): HeroSlide[] {
  if (!config || !('slides' in config) || !Array.isArray(config.slides)) return [];
  return (config.slides as Array<Record<string, unknown>>)
    .filter((s) => s && typeof s.imageUrl === 'string' && typeof s.ctaHref === 'string')
    .map((s) => ({
      imageUrl: String(s.imageUrl),
      titleEn: String(s.titleEn ?? ''),
      titleBn: String(s.titleBn ?? ''),
      ctaHref: String(s.ctaHref),
      ctaLabelEn: String(s.ctaLabelEn ?? 'Shop'),
      ctaLabelBn: String(s.ctaLabelBn ?? 'কিনুন'),
    }));
}

function extractDealEndsAt(config: Record<string, unknown> | null | undefined): string | null {
  if (!config || typeof config.endsAt !== 'string') return null;
  return config.endsAt;
}

function extractCategoryIds(
  config: Record<string, unknown> | null | undefined,
): string[] {
  if (!config || !('categoryIds' in config) || !Array.isArray(config.categoryIds)) {
    return [];
  }
  return (config.categoryIds as unknown[]).filter(
    (id): id is string => typeof id === 'string' && id.length > 0,
  );
}

function extractPromoBanners(
  config: Record<string, unknown> | null | undefined,
  locale: 'bn' | 'en',
): Array<{ imageUrl: string; titleEn: string; titleBn: string; ctaHref: string; ctaLabelEn: string; ctaLabelBn: string }> {
  if (config && 'banners' in config && Array.isArray(config.banners)) {
    return (config.banners as Array<Record<string, unknown>>)
      .filter((b) => b && typeof b.imageUrl === 'string' && typeof b.ctaHref === 'string')
      .slice(0, 4)
      .map((b) => ({
        imageUrl: String(b.imageUrl),
        titleEn: String(b.titleEn ?? ''),
        titleBn: String(b.titleBn ?? ''),
        ctaHref: String(b.ctaHref),
        ctaLabelEn: String(b.ctaLabelEn ?? 'Shop'),
        ctaLabelBn: String(b.ctaLabelBn ?? 'কিনুন'),
      }));
  }
  return fallbackPromoBanners(locale);
}

function extractWideBanners(
  config: Record<string, unknown> | null | undefined,
  locale: 'bn' | 'en',
): Array<{ imageUrl: string; titleEn: string; titleBn: string; ctaHref: string; ctaLabelEn: string; ctaLabelBn: string }> {
  if (config && 'banners' in config && Array.isArray(config.banners)) {
    return (config.banners as Array<Record<string, unknown>>)
      .filter((b) => b && typeof b.imageUrl === 'string' && typeof b.ctaHref === 'string')
      .slice(0, 1)
      .map((b) => ({
        imageUrl: String(b.imageUrl),
        titleEn: String(b.titleEn ?? ''),
        titleBn: String(b.titleBn ?? ''),
        ctaHref: String(b.ctaHref),
        ctaLabelEn: String(b.ctaLabelEn ?? 'Shop'),
        ctaLabelBn: String(b.ctaLabelBn ?? 'কিনুন'),
      }));
  }
  return fallbackPromoBanners(locale).slice(0, 1);
}

function extractSeoParagraphs(
  config: Record<string, unknown> | null | undefined,
  locale: 'bn' | 'en',
): string[] {
  if (config && 'paragraphs' in config && Array.isArray(config.paragraphs)) {
    return (config.paragraphs as unknown[])
      .filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
  }
  return locale === 'bn'
    ? [
        'ব্লু-গোফার বাংলাদেশের একটি দ্রুত বর্ধনশীল অনলাইন মার্কেটপ্লেস। ইলেকট্রনিক্স, ফ্যাশন, হোম ও কিচেন, বিউটি সহ সব ধরনের পণ্য এক জায়গায়।',
        'বিকাশ, নগদ, কার্ড বা ক্যাশ অন ডেলিভারিতে নিরাপদ পেমেন্ট। ১,৫০০ টাকার উপরে অর্ডারে ফ্রি ডেলিভারি। ৭ দিনের সহজ রিটার্ন।',
      ]
    : [
        "BlueGofer is Bangladesh's rapidly growing online marketplace offering products across Electronics, Fashion, Home & Kitchen, Beauty and more.",
        'Pay safely with bKash, Nagad, Card, or Cash on Delivery. Free delivery on eligible orders over ৳1,500. Easy 7-day returns.',
      ];
}

function fallbackPromoBanners(locale: 'bn' | 'en') {
  const mk = (bg: string, fg: string) => placeholderSvg('', bg, fg);
  return [
    {
      imageUrl: mk('EFF7FB', '25729A'),
      titleEn: 'Smartphones under ৳20,000',
      titleBn: '২০,০০০ টাকার নিচে স্মার্টফোন',
      ctaHref: `/${locale}/c/smartphones`,
      ctaLabelEn: 'Shop the range',
      ctaLabelBn: 'কিনুন',
    },
    {
      imageUrl: mk('FEF5E7', 'B45309'),
      titleEn: 'Fashion Fest — Min 50% off',
      titleBn: 'ফ্যাশন ফেস্ট — ন্যূনতম ৫০% ছাড়',
      ctaHref: `/${locale}/c/fashion`,
      ctaLabelEn: 'Explore styles',
      ctaLabelBn: 'দেখুন',
    },
    {
      imageUrl: mk('EAF7EF', '16A34A'),
      titleEn: 'Grocery Super Saver Days',
      titleBn: 'গ্রোসারি সুপার সেভার',
      ctaHref: `/${locale}/c/home-kitchen`,
      ctaLabelEn: 'Stock up now',
      ctaLabelBn: 'স্টক করুন',
    },
    {
      imageUrl: mk('E0F2FE', '0C2B3D'),
      titleEn: 'Home Makeover from ৳499',
      titleBn: 'হোম মেকওভার ৪৯৯ টাকা থেকে',
      ctaHref: `/${locale}/c/home-kitchen`,
      ctaLabelEn: 'Discover deals',
      ctaLabelBn: 'আবিষ্কার করুন',
    },
  ];
}

function defaultDealEnd(): string {
  return new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
}

function placeholderSvg(label: string, bg: string, fg: string): string {
  const text = label
    ? '<text x="400" y="200" font-family="Inter,sans-serif" font-size="36" font-weight="700" fill="#' + fg + '" text-anchor="middle" dominant-baseline="middle">' + label + '</text>'
    : '';
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400">' +
    '<rect width="800" height="400" fill="#' + bg + '"/>' +
    text +
    '</svg>';
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}