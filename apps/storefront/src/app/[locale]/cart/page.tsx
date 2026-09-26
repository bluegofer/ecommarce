import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDictionary, isLocale } from '@/lib/i18n';
import { catalogApi } from '@/lib/api';
import type { CategoryNode } from '@/lib/api/types';
import { Header, Footer, Breadcrumbs, AnnouncementBar } from '@/components/layout';
import { CartClient } from '@/components/cart';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface PageProps {
  params: { locale: string };
}

export default async function CartPage({ params }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as 'bn' | 'en';
  const t = getDictionary(locale);

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

      <main id="main" style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 24px 48px' }}>
        <h1 className="visually-hidden">
          {locale === 'bn' ? 'শপিং কার্ট' : 'Shopping Cart'}
        </h1>
        <Breadcrumbs
          items={[
            { label: locale === 'bn' ? 'হোম' : 'Home', href: `/${locale}` },
            { label: locale === 'bn' ? 'কার্ট' : 'Cart' },
          ]}
          locale={locale}
        />

        <CartClient
          locale={locale}
          labels={{
            title: t['cart.title'],
            selectedCount: locale === 'bn' ? '{n}টি পণ্য সিলেক্টেড' : '{n} items selected',
            subtotal: t['cart.subtotal'],
            delivery: locale === 'bn' ? 'ডেলিভারি' : 'Delivery',
            freeLabel: locale === 'bn' ? 'ফ্রি' : 'FREE',
            discount: locale === 'bn' ? 'ছাড়' : 'Discount',
            total: locale === 'bn' ? 'মোট' : 'Total',
            couponPlaceholder: t['cart.coupon'],
            couponApply: locale === 'bn' ? 'প্রয়োগ' : 'Apply',
            couponRemove: t['cart.remove'],
            couponSuccess: locale === 'bn' ? '✓ কুপন প্রয়োগ হয়েছে' : '✓ Coupon applied',
            couponError: locale === 'bn' ? 'কুপন কোড সঠিক নয়' : 'Invalid coupon code',
            proceed: t['cart.proceed'],
            secure: locale === 'bn' ? 'নিরাপদ চেকআউট' : 'Secure checkout',
            emiNote: locale === 'bn' ? 'bKash · Nagad · Card · COD' : 'bKash · Nagad · Card · COD',
            remove: t['cart.remove'],
            removedUndo: locale === 'bn' ? 'কার্ট থেকে সরানো হয়েছে' : 'Removed from cart',
            undo: locale === 'bn' ? 'ফিরিয়ে আনুন' : 'Undo',
            saveLater: t['cart.save_later'],
            movedToSaved: locale === 'bn' ? 'পরে কিনার জন্য সংরক্ষিত' : 'Saved for later',
            inStock: t['product.in_stock'],
            lowStock: t['product.low_stock'],
            outOfStock: t['product.out_of_stock'],
            qty: t['product.qty'],
            savedHeader: locale === 'bn' ? 'সংরক্ষিত ({n}টি পণ্য)' : 'Saved for later ({n} items)',
            moveToCart: locale === 'bn' ? 'কার্টে নিন' : 'Move to Cart',
            emptyTitle: t['cart.empty'],
            emptyBody: locale === 'bn' ? 'কেনাকাটা শুরু করতে আমাদের ডিল দেখুন' : 'Browse our deals to start shopping',
            emptyCta: locale === 'bn' ? 'আজকের অফার দেখুন' : "Shop Today's Deals",
          }}
        />
      </main>

      <Footer locale={locale} />
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
    brand: 'NoLimitShopping',
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