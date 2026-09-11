import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDictionary, isLocale } from '@/lib/i18n';
import { catalogApi } from '@/lib/api';
import type { CategoryNode } from '@/lib/api/types';
import { Header, Footer, Breadcrumbs, AnnouncementBar } from '@/components/layout';

// Confirmation page reads order data via searchParams (order + phone) and
// fetches the order server-side. Dynamic for now.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Order Confirmed — SkyMart',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: { locale: string };
  searchParams: Record<string, string | string[] | undefined>;
}

function stringParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function OrderConfirmationPage({ params, searchParams }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as 'bn' | 'en';
  const t = getDictionary(locale);

  const orderNumber = stringParam(searchParams.order);
  const phone = stringParam(searchParams.phone);

  const categories = await catalogApi.getCategoryTree().catch(() => [] as CategoryNode[]);

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

      <main
        id="main"
        style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px' }}
      >
        <Breadcrumbs
          items={[
            { label: locale === 'bn' ? 'হোম' : 'Home', href: `/${locale}` },
            { label: locale === 'bn' ? 'অর্ডার নিশ্চিত' : 'Order Confirmed' },
          ]}
          locale={locale}
        />

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 16 }} aria-hidden="true">
            ✓
          </div>
          <h1
            style={{
              fontFamily: 'var(--sk-font-en)',
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--sk-ink)',
              margin: '0 0 8px',
            }}
          >
            {t['order.placed_msg']}
          </h1>

          {orderNumber ? (
            <p
              style={{
                fontFamily: 'var(--sk-font-en)',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--sk-body)',
                margin: '16px 0 8px',
              }}
            >
              {locale === 'bn' ? 'অর্ডার নম্বর' : 'Order'}: <code>{orderNumber}</code>
            </p>
          ) : null}

          <p
            style={{
              fontFamily: 'var(--sk-font-en)',
              fontSize: 14,
              color: 'var(--sk-muted)',
              margin: '16px 0 24px',
            }}
          >
            {locale === 'bn'
              ? 'শীঘ্রই SMS/ইমেইলে অর্ডার আপডেট পাবেন।'
              : "You'll receive order updates via SMS/email shortly."}
          </p>

          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <a
              href={`/${locale}/account/orders`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 44,
                padding: '0 20px',
                background: 'var(--sk-brand-300)',
                color: 'var(--sk-brand-950)',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              {t['order.track']}
            </a>
            <a
              href={`/${locale}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 44,
                padding: '0 20px',
                background: '#FFFFFF',
                color: 'var(--sk-brand-700)',
                border: '1.5px solid var(--sk-brand-300)',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              {t['common.continue']}
            </a>
          </div>

          <p
            style={{
              fontFamily: 'var(--sk-font-en)',
              fontSize: 12,
              color: 'var(--sk-muted)',
              marginTop: 32,
            }}
          >
            {locale === 'bn'
              ? 'সম্পূর্ণ ট্র্যাকিং ও ইনভয়েস Step 8.11-এ আসবে।'
              : 'Full tracking & invoice arrives in Step 8.11.'}
          </p>
        </div>
      </main>

      <Footer
        locale={locale}
        labels={footerLabels(t)}
        columns={footerColumns(t, locale)}
      />
    </>
  );
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