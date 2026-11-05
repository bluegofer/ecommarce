// apps/storefront/src/components/layout/StorefrontShell.tsx
// Shared shell for public-facing pages — Header + Footer + Announcement bar.
// Fetches categories + HEADER menu once, then renders consistent chrome.
import { getDictionary, type Locale } from '@/lib/i18n';
import { catalogApi, cmsApi } from '@/lib/api';
import type { CategoryNode } from '@/lib/api/types';
import { buildHeaderNavLinks } from '@/lib/cms/nav';
import { Header } from './Header';
import { Footer } from './Footer';
import { AnnouncementBar } from './AnnouncementBar';

export interface StorefrontShellProps {
  locale: Locale;
  children: React.ReactNode;
  hideAnnouncement?: boolean;
  hideFooter?: boolean;
  hideHeader?: boolean;
}

export async function StorefrontShell({
  locale,
  children,
  hideAnnouncement = false,
  hideFooter = false,
  hideHeader = false,
}: StorefrontShellProps) {
  const bn = locale === 'bn';
  const t = getDictionary(locale);

  const [categories, headerMenu] = await Promise.all([
    catalogApi.getCategoryTree().catch(() => [] as CategoryNode[]),
    cmsApi.getMenu('HEADER').catch(() => null),
  ]);

  const navLinks = buildHeaderNavLinks(locale, headerMenu);

  return (
    <>
      {!hideAnnouncement && (
        <AnnouncementBar
          message={bn ? '১,৫০০ টাকার উপরে ফ্রি ডেলিভারি' : 'Free delivery over ৳1,500'}
          ctaLabel={bn ? 'অফার দেখুন' : 'See deals'}
          ctaHref={`/${locale}/deals`}
          locale={locale}
        />
      )}
      {!hideHeader && (
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
            href: `/${locale}/c/${c.slug}`,
            children: c.children.map((ch) => ({
              id: ch.id,
              label: bn ? ch.nameBn : ch.nameEn,
              href: `/${locale}/c/${ch.slug}`,
            })),
          }))}
          alternateLocaleHref={`/${locale === 'bn' ? 'en' : 'bn'}`}
        />
      )}
      {children}
      {!hideFooter && <Footer locale={locale} />}
    </>
  );
}