import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDictionary, isLocale } from '@/lib/i18n';
import { catalogApi } from '@/lib/api';
import type { CategoryNode } from '@/lib/api/types';
import { Header, Footer, Breadcrumbs, AnnouncementBar } from '@/components/layout';
import { CheckoutClient } from '@/components/checkout';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface PageProps {
  params: { locale: string };
}

export default async function CheckoutPage({ params }: PageProps) {
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

      <main id="main" style={{ maxWidth: 1080, margin: '0 auto', padding: '16px 24px 64px' }}>
        <h1 className="visually-hidden">
          {locale === 'bn' ? 'চেকআউট' : 'Checkout'}
        </h1>
        <Breadcrumbs
          items={[
            { label: locale === 'bn' ? 'হোম' : 'Home', href: `/${locale}` },
            { label: locale === 'bn' ? 'কার্ট' : 'Cart', href: `/${locale}/cart` },
            { label: locale === 'bn' ? 'চেকআউট' : 'Checkout' },
          ]}
          locale={locale}
        />

        <CheckoutClient
          locale={locale}
          labels={{
            stepAddress: t['checkout.address'],
            stepPayment: t['checkout.payment'],
            stepReview: t['checkout.review'],
            addressTitle: t['checkout.address'],
            recipientName: locale === 'bn' ? 'গ্রাহকের নাম' : 'Recipient name',
            phone: locale === 'bn' ? 'মোবাইল নম্বর' : 'Phone number',
            email: locale === 'bn' ? 'ইমেইল (ঐচ্ছিক)' : 'Email (optional)',
            city: locale === 'bn' ? 'শহর' : 'City',
            cityPlaceholder: locale === 'bn' ? 'শহর নির্বাচন করুন' : 'Select city',
            area: locale === 'bn' ? 'এলাকা' : 'Area',
            areaPlaceholder: locale === 'bn' ? 'যেমন: বনানী' : 'e.g. Banani',
            line1: locale === 'bn' ? 'সম্পূর্ণ ঠিকানা' : 'Full address',
            line1Placeholder: locale === 'bn' ? 'বাসা/রোড/ব্লক' : 'House / Road / Block',
            postcode: locale === 'bn' ? 'পোস্ট কোড (ঐচ্ছিক)' : 'Postcode (optional)',
            continueLabel: t['common.continue'],
            required: locale === 'bn' ? 'আবশ্যক' : 'Required',
            invalidPhone: locale === 'bn' ? 'সঠিক মোবাইল নম্বর দিন' : 'Enter a valid phone',
            invalidEmail: locale === 'bn' ? 'সঠিক ইমেইল দিন' : 'Enter a valid email',
            paymentTitle: t['checkout.payment'],
            bkashLabel: 'bKash',
            bkashDesc: locale === 'bn' ? 'বিকাশ মোবাইল ওয়ালেট' : 'Pay securely via bKash',
            nagadLabel: 'Nagad',
            nagadDesc: locale === 'bn' ? 'নগদ মোবাইল ওয়ালেট' : 'Pay via Nagad',
            sslcommerzLabel: locale === 'bn' ? 'কার্ড / ব্যাংক' : 'Credit / Debit Card',
            sslcommerzDesc: locale === 'bn' ? 'SSLCommerz এর মাধ্যমে' : 'Visa · Mastercard via SSLCommerz',
            codLabel: t['checkout.cod'],
            codDesc: locale === 'bn' ? 'পণ্য হাতে পেয়ে পরিশোধ' : 'Pay cash when the order arrives',
            codFeeNote: locale === 'bn' ? 'ডেলিভারির সময় {total} পরিশোধ করুন' : 'Pay {total} in cash on delivery',
            back: t['common.continue'] === 'Continue' ? 'Back' : 'পূর্ববর্তী',
            reviewTitle: t['checkout.review'],
            addressSection: t['checkout.address'],
            paymentSection: t['checkout.payment'],
            itemsSection: locale === 'bn' ? 'পণ্য' : 'Items',
            edit: locale === 'bn' ? 'পরিবর্তন' : 'Edit',
            placeOrder: t['checkout.place_order'],
            placing: locale === 'bn' ? 'অর্ডার প্রক্রিয়া চলছে...' : 'Placing order...',
            terms: locale === 'bn'
              ? 'অর্ডার করলে আপনি আমাদের শর্তাবলী ও গোপনীয়তা নীতিতে সম্মত হচ্ছেন।'
              : 'By placing this order you agree to our Terms & Privacy Policy.',
            summaryTitle: locale === 'bn' ? 'অর্ডার সারাংশ' : 'Order Summary',
            subtotal: t['cart.subtotal'],
            delivery: locale === 'bn' ? 'ডেলিভারি' : 'Delivery',
            discount: locale === 'bn' ? 'ছাড়' : 'Discount',
            total: locale === 'bn' ? 'মোট' : 'Total',
            emptyTitle: t['cart.empty'],
            emptyBody: locale === 'bn' ? 'চেকআউট করতে কার্টে পণ্য যোগ করুন' : 'Add items to your cart to checkout',
            emptyCta: locale === 'bn' ? 'আজকের অফার দেখুন' : "Shop Today's Deals",
            orderPlaced: t['order.confirmed'],
            orderFailed: locale === 'bn' ? 'অর্ডার ব্যর্থ হয়েছে' : 'Order failed',
            paymentNotReady:
              locale === 'bn'
                ? 'পেমেন্ট ইন্টিগ্রেশন Step 10-এ আসছে — এখন ক্যাশ অন ডেলিভারি ব্যবহার করুন'
                : 'Online payment integration arrives in Step 10 — please use Cash on Delivery for now',
            cityOptions: [
              { value: 'Dhaka', label: locale === 'bn' ? 'ঢাকা' : 'Dhaka' },
              { value: 'Chattogram', label: locale === 'bn' ? 'চট্টগ্রাম' : 'Chattogram' },
              { value: 'Sylhet', label: locale === 'bn' ? 'সিলেট' : 'Sylhet' },
              { value: 'Khulna', label: locale === 'bn' ? 'খুলনা' : 'Khulna' },
              { value: 'Rajshahi', label: locale === 'bn' ? 'রাজশাহী' : 'Rajshahi' },
              { value: 'Barishal', label: locale === 'bn' ? 'বরিশাল' : 'Barishal' },
              { value: 'Rangpur', label: locale === 'bn' ? 'রংপুর' : 'Rangpur' },
              { value: 'Mymensingh', label: locale === 'bn' ? 'ময়মনসিংহ' : 'Mymensingh' },
            ],
            paymentNames: {
              bkash: 'bKash',
              nagad: 'Nagad',
              sslcommerz: locale === 'bn' ? 'কার্ড / ব্যাংক' : 'Card / Bank',
              cod: t['checkout.cod'],
            },
          }}
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
    brand: 'BlueGofer',
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