import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  ConfirmationClient,
  type ConfirmationLabels,
} from '@/components/order-confirmation';
import { isLocale, type Locale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Order Confirmed | BlueGofer',
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

export default function OrderConfirmationPage({ params, searchParams }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const bn = locale === 'bn';

  const orderNumber = stringParam(searchParams.order);
  const phone = stringParam(searchParams.phone);

  const labels: ConfirmationLabels = {
    heading: bn ? 'ধন্যবাদ! আপনার অর্ডার সম্পন্ন হয়েছে' : 'Thank you! Your order is placed',
    subhead: bn
      ? 'শীঘ্রই SMS/ইমেইলে অর্ডার আপডেট পাবেন।'
      : "You'll receive order updates via SMS/email shortly.",
    orderLabel: bn ? 'অর্ডার নম্বর' : 'Order',
    orderDate: bn ? 'তারিখ' : 'Date',
    items: bn ? 'পণ্যসমূহ' : 'Items',
    subtotal: bn ? 'সাব-টোটাল' : 'Subtotal',
    delivery: bn ? 'ডেলিভারি' : 'Delivery',
    discount: bn ? 'ডিসকাউন্ট' : 'Discount',
    total: bn ? 'মোট' : 'Total',
    free: bn ? 'ফ্রি' : 'FREE',
    payment: bn ? 'পেমেন্ট' : 'Payment',
    shippingTo: bn ? 'ডেলিভারি ঠিকানা' : 'Shipping to',
    estimatedDelivery: bn ? 'আনুমানিক ডেলিভারি: শীঘ্রই' : 'Estimated delivery: soon',
    trackOrder: bn ? 'অর্ডার ট্র্যাক করুন' : 'Track Order',
    continueShopping: bn ? 'আরো কিনুন' : 'Continue Shopping',
    downloadInvoice: bn ? 'ইনভয়েস ডাউনলোড' : 'Download Invoice',
    guestTip: bn
      ? 'এই ইমেইল দিয়ে অ্যাকাউন্ট খুলুন — সব অর্ডার ট্র্যাক, ঠিকানা সেভ, দ্রুত চেকআউট।'
      : 'Create an account with this email to track all orders, save addresses, and checkout faster.',
    createAccount: bn ? 'অ্যাকাউন্ট খুলুন' : 'Create account',
    loading: bn ? 'লোড হচ্ছে…' : 'Loading…',
    errorText: bn ? 'লোড করা যায়নি' : 'Could not load order',
    notFound: bn ? 'অর্ডার খুঁজে পাওয়া যায়নি' : 'Order not found',
    backHome: bn ? 'হোমে যান' : 'Go to Home',
  };

  if (!orderNumber || !phone) {
    return (
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--sk-ink)' }}>
          {labels.notFound}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--sk-muted)', marginTop: 12 }}>
          {bn ? 'URL-এ অর্ডার নম্বর বা ফোন নম্বর নেই।' : 'Order number or phone missing from URL.'}
        </p>
        <a
          href={`/${locale}`}
          style={{
            display: 'inline-block',
            marginTop: 24,
            padding: '10px 20px',
            background: 'var(--sk-cta-primary)',
            color: 'var(--sk-brand-950)',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          {labels.backHome}
        </a>
      </main>
    );
  }

  return (
    <main id="main">
      <ConfirmationClient
        locale={locale}
        orderNumber={orderNumber}
        phone={phone}
        labels={labels}
      />
    </main>
  );
}