import { notFound } from 'next/navigation';
import { Header, Footer, AppDownloadBanner } from '@/components/layout';
import { AccountLayoutClient, type AccountSidebarLabels } from '@/components/account';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { catalogApi, cmsApi } from '@/lib/api';
import type { CategoryNode } from '@/lib/api/types';

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const bn = locale === 'bn';
  const t = getDictionary(locale);

  const [categories, headerMenu, footerMenu] = await Promise.all([
    catalogApi.getCategoryTree().catch(() => [] as CategoryNode[]),
    cmsApi.getMenu('HEADER').catch(() => null),
    cmsApi.getMenu('FOOTER').catch(() => null),
  ]);

  void footerMenu;

  const sidebarLabels: AccountSidebarLabels = {
    home: bn ? 'হোম' : 'Home',
    overview: bn ? 'সংক্ষিপ্ত' : 'Overview',
    orders: bn ? 'আমার অর্ডার' : 'Your Orders',
    returns: bn ? 'ফেরত ও রিফান্ড' : 'Returns & Refunds',
    wishlist: bn ? 'উইশলিস্ট' : 'Wishlist',
    addresses: bn ? 'ঠিকানা' : 'Addresses',
    settings: bn ? 'সেটিংস' : 'Settings',
    signOut: bn ? 'সাইন আউট' : 'Sign Out',
  };

  const cmsNavLinks =
    headerMenu && headerMenu.items.length > 0
      ? headerMenu.items
          .filter((it) => it.isActive)
          .map((it) => ({
            label: bn ? it.labelBn : it.labelEn,
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

  return (
    <>
      <Header
        locale={locale}
        labels={{
          deliverTo: t['header.deliver_to'],
          deliverPlaceholder: bn ? 'ঢাকা ১২১২' : 'Dhaka 1212',
          searchPlaceholder: t['search.placeholder'],
          searchAll: t['nav.all'],
          searchIn: `SEARCH FOR {q} IN {category}`,
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
            languageSwitch: bn ? 'English' : 'বাংলা',
            empty: 'No categories yet',
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
        alternateLocaleHref={`/${bn ? 'en' : 'bn'}`}
      />

      <AccountLayoutClient locale={locale} sidebarLabels={sidebarLabels}>
        {children}
      </AccountLayoutClient>

      <AppDownloadBanner locale={locale} />
      <Footer locale={locale} />
    </>
  );
}