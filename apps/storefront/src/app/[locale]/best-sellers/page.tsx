import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDictionary, isLocale } from '@/lib/i18n';
import { catalogApi, cmsApi } from '@/lib/api';
import type { CategoryNode, SearchResponse } from '@/lib/api/types';
import { Header, Footer, Breadcrumbs, AnnouncementBar } from '@/components/layout';
import { PlpClient } from '@/components/plp';
import { buildHeaderNavLinks } from '@/lib/cms/nav';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(params.locale)) return {};
  const bn = params.locale === 'bn';
  return {
    title: bn ? 'বেস্ট সেলার | নো লিমিট শপিং' : 'Best Sellers | NoLimitShopping',
    description: bn ? 'সবচেয়ে জনপ্রিয় পণ্য।' : 'Our most-loved products.',
    robots: { index: true, follow: true },
  };
}

const EMPTY_SEARCH: SearchResponse = {
  items: [], total: 0, page: 1, pageSize: 48, totalPages: 1,
  facets: { brands: [], categories: [], priceRanges: [], attributes: {}, ratings: [] },
};

export default async function BestSellersPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as 'bn' | 'en';
  const bn = locale === 'bn';
  const t = getDictionary(locale);

  const [categories, results, recommended, headerMenu] = await Promise.all([
    catalogApi.getCategoryTree().catch(() => [] as CategoryNode[]),
    catalogApi.searchProducts({ sort: 'best_sellers', page: 1, pageSize: 48 }).catch(() => EMPTY_SEARCH),
    catalogApi.searchProducts({ sort: 'rating', page: 1, pageSize: 6 }).catch(() => EMPTY_SEARCH),
    cmsApi.getMenu('HEADER').catch(() => null),
  ]);

  const navLinks = buildHeaderNavLinks(locale, headerMenu);
  const heading = bn ? 'বেস্ট সেলার' : 'Best Sellers';
  const crumbItems = [{ label: bn ? 'হোম' : 'Home', href: '/' + locale }, { label: heading }];

  return (
    <>
      <AnnouncementBar
        message={bn ? '১,৫০০ টাকার উপরে ফ্রি ডেলিভারি' : 'Free delivery over ৳1,500'}
        ctaLabel={bn ? 'অফার দেখুন' : 'See deals'}
        ctaHref={'/' + locale + '/deals'}
        locale={locale}
      />
      <Header
        locale={locale}
        labels={{
          deliverTo: t['header.deliver_to'],
          deliverPlaceholder: bn ? 'ঢাকা ১২১২' : 'Dhaka 1212',
          searchPlaceholder: t['search.placeholder'],
          searchAll: t['nav.all'],
          searchIn: 'SEARCH FOR {q} IN {category}',
          helloSignIn: t['auth.signin'],
          accountLists: t['header.account'],
          returns: bn ? 'রিটার্ন' : 'Returns',
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
            signIn: 'Sign In',
            orders: t['header.orders'],
            back: 'Back',
            mainMenu: 'Main Menu',
          },
        }}
        navLinks={navLinks}
        categories={categories.map((c) => ({
          id: c.id,
          label: bn ? c.nameBn : c.nameEn,
          href: '/' + locale + '/c/' + c.slug,
          children: c.children.map((ch) => ({
            id: ch.id,
            label: bn ? ch.nameBn : ch.nameEn,
            href: '/' + locale + '/c/' + ch.slug,
          })),
        }))}
        alternateLocaleHref={'/' + (locale === 'bn' ? 'en' : 'bn')}
      />

      <main id="main" style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 24px 48px' }}>
        <h1 className="visually-hidden">{heading}</h1>
        <Breadcrumbs items={crumbItems} locale={locale} />
        <PlpClient initial={results} heading={heading} recommended={recommended.items} locale={locale} dict={t} />
      </main>
      <Footer locale={locale} />
    </>
  );
}