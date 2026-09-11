import { notFound } from 'next/navigation';
import { getDictionary, isLocale } from '@/lib/i18n';
import { catalogApi, cmsApi, promotionsApi } from '@/lib/api';
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

export const revalidate = 60; // ISR — refresh every 60s

export default async function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as 'bn' | 'en';
  const t = getDictionary(locale);

  // Parallel fetch — home-feed, category tree, best-sellers, new arrivals
  const [feed, categories, bestSellers, newArrivals] = await Promise.all([
    cmsApi.getHomeFeed().catch(() => ({ announcements: [], sections: [], activeFlashSales: [], activePopups: [] })),
    catalogApi.getCategoryTree().catch(() => [] as CategoryNode[]),
    catalogApi.listProducts({ status: 'PUBLISHED', sort: 'best_sellers', limit: 10 }).catch(() => ({ items: [], total: 0, page: 1, pageSize: 24, totalPages: 1 })),
    catalogApi.listProducts({ status: 'PUBLISHED', sort: 'newest', limit: 10 }).catch(() => ({ items: [], total: 0, page: 1, pageSize: 24, totalPages: 1 })),
  ]);

  // ── Extract sections from CMS feed ──
  const heroSection = feed.sections.find((s) => s.sectionType === 'HERO_CAROUSEL');
  const dealStripSection = feed.sections.find((s) => s.sectionType === 'DEAL_STRIP');
  const heroSlides: HeroSlide[] = extractHeroSlides(heroSection?.config);
  const dealEndsAt = extractDealEndsAt(dealStripSection?.config) ?? defaultDealEnd();

  // ── Announcement ──
  const activeAnnouncement = feed.announcements[0];

  // ── Header labels ──
  const navLinks = [
    { label: t['nav.deals'], href: `/${locale}/deals` },
    { label: t['nav.best'], href: `/${locale}/c/electronics` },
    { label: t['nav.new'], href: `/${locale}/c/electronics` },
    { label: 'Electronics', href: `/${locale}/c/electronics` },
    { label: 'Fashion', href: `/${locale}/c/fashion` },
    { label: 'Home & Kitchen', href: `/${locale}/c/home-kitchen` },
  ];

  const promoBanners = [
    {
      imageUrl: placeholderSvg('', 'EFF7FB', '25729A'),
      titleEn: 'Smartphones under ৳20,000',
      titleBn: '২০,০০০ টাকার নিচে স্মার্টফোন',
      ctaHref: `/${locale}/c/smartphones`,
      ctaLabelEn: 'Shop the range',
      ctaLabelBn: 'কিনুন',
    },
    {
      imageUrl: placeholderSvg('', 'FEF5E7', 'B45309'),
      titleEn: 'Fashion Fest — Min 50% off',
      titleBn: 'ফ্যাশন ফেস্ট — ন্যূনতম ৫০% ছাড়',
      ctaHref: `/${locale}/c/fashion`,
      ctaLabelEn: 'Explore styles',
      ctaLabelBn: 'দেখুন',
    },
    {
      imageUrl: placeholderSvg('', 'EAF7EF', '16A34A'),
      titleEn: 'Grocery Super Saver Days',
      titleBn: 'গ্রোসারি সুপার সেভার',
      ctaHref: `/${locale}/c/home-kitchen`,
      ctaLabelEn: 'Stock up now',
      ctaLabelBn: 'স্টক করুন',
    },
    {
      imageUrl: placeholderSvg('', 'E0F2FE', '0C2B3D'),
      titleEn: 'Home Makeover from ৳499',
      titleBn: 'হোম মেকওভার ৪৯৯ টাকা থেকে',
      ctaHref: `/${locale}/c/home-kitchen`,
      ctaLabelEn: 'Discover deals',
      ctaLabelBn: 'আবিষ্কার করুন',
    },
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

        {/* Visually hidden h1 for a11y + SEO — page has no visible h1 by design (UI Spec C1) */}
        <h1 className="visually-hidden">
          {locale === 'bn' ? 'স্কাইমার্ট — অনলাইনে কেনাকাটা' : 'SkyMart — Shop Online in Bangladesh'}
        </h1>

        {heroSlides.length > 0 ? <HeroCarousel slides={heroSlides} locale={locale} autoplayMs={6000} /> : null}
        <CategoryTiles categories={categories} locale={locale} limit={4} />

        <DealStrip
          endsAtIso={dealEndsAt}
          label={locale === 'bn' ? "আজকের অফার শেষ হচ্ছে" : "Today's Deals end in"}
          ctaLabel={locale === 'bn' ? 'সব দেখুন →' : 'See all deals →'}
          ctaHref={`/${locale}/deals`}
          locale={locale}
        />

        {bestSellers.items.length > 0 ? (
          <ProductCarousel
            title={locale === 'bn' ? 'বেস্ট সেলার' : 'Best Sellers'}
            seeAllHref={`/${locale}/deals`}
            seeAllLabel={locale === 'bn' ? 'সব দেখুন →' : 'See all →'}
            products={bestSellers.items}
            locale={locale}
            dict={t}
          />
        ) : null}

        <PromoBanners banners={promoBanners} locale={locale} />

        {newArrivals.items.length > 0 ? (
          <ProductCarousel
            title={locale === 'bn' ? 'নতুন পণ্য' : 'New Arrivals'}
            seeAllHref={`/${locale}/deals`}
            seeAllLabel={locale === 'bn' ? 'সব দেখুন →' : 'See all →'}
            products={newArrivals.items}
            locale={locale}
            dict={t}
          />
        ) : null}

        <SeoTextBlock
          title={locale === 'bn' ? 'স্কাইমার্টে অনলাইনে কিনুন' : 'Shop online at SkyMart'}
          paragraphs={
            locale === 'bn'
              ? [
                  'স্কাইমার্ট বাংলাদেশের একটি দ্রুত বর্ধনশীল অনলাইন মার্কেটপ্লেস। ইলেকট্রনিক্স, ফ্যাশন, হোম ও কিচেন, বিউটি সহ সব ধরনের পণ্য এক জায়গায়।',
                  'বিকাশ, নগদ, কার্ড বা ক্যাশ অন ডেলিভারিতে নিরাপদ পেমেন্ট। ১,৫০০ টাকার উপরে অর্ডারে ফ্রি ডেলিভারি। ৭ দিনের সহজ রিটার্ন।',
                ]
              : [
                  "SkyMart is Bangladesh's rapidly growing online marketplace offering products across Electronics, Fashion, Home & Kitchen, Beauty and more.",
                  'Pay safely with bKash, Nagad, Card, or Cash on Delivery. Free delivery on eligible orders over ৳1,500. Easy 7-day returns.',
                ]
          }
          seeMoreLabel={locale === 'bn' ? 'আরো দেখুন' : 'See more'}
          seeLessLabel={locale === 'bn' ? 'কম দেখুন' : 'See less'}
        />
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
          brand: 'SkyMart',
        }}
        columns={[
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
        ]}
      />
    </>
  );
}

// ── Helpers ──────────────────────────────────────

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