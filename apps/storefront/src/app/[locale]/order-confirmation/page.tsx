import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import {
  ConfirmationClient,
  type ConfirmationLabels,
} from '@/components/order-confirmation';
import { isLocale, type Locale } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Order Confirmed | NoLimitShopping',
  robots: { index: false, follow: false },
};

// Guest confirmation reads order number + phone from searchParams.
// TDD §7.2 + UI Spec C14; DECISIONS.md Step 8.11 (lookup strategy).
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { locale: string };
  searchParams: { order?: string; phone?: string };
}

export default function OrderConfirmationPage({
  params,
  searchParams,
}: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const bn = locale === 'bn';

  const orderNumber =
    typeof searchParams.order === 'string' ? searchParams.order.trim() : '';
  const phone =
    typeof searchParams.phone === 'string' ? searchParams.phone.trim() : '';

  const labels: ConfirmationLabels = {
    heading: bn ? 'অর্ডার নিশ্চিত হয়েছে!' : 'Order Confirmed!',
    subhead: bn
      ? 'আপনার অর্ডার সফলভাবে জমা হয়েছে। শীঘ্রই যোগাযোগ করা হবে।'
      : 'Your order has been placed successfully. We will contact you shortly.',
    orderLabel: bn ? 'অর্ডার নম্বর' : 'Order',
    orderDate: bn ? 'অর্ডারের তারিখ' : 'Order date',
    items: bn ? 'পণ্যসমূহ' : 'Items',
    subtotal: bn ? 'সাবটোটাল' : 'Subtotal',
    delivery: bn ? 'ডেলিভারি চার্জ' : 'Delivery charge',
    discount: bn ? 'ছাড়' : 'Discount',
    total: bn ? 'মোট' : 'Total',
    free: bn ? 'ফ্রি' : 'Free',
    payment: bn ? 'পেমেন্ট' : 'Payment',
    shippingTo: bn ? 'ডেলিভারি ঠিকানা' : 'Shipping to',
    estimatedDelivery: bn
      ? 'আনুমানিক ডেলিভারি: ২-৪ কর্মদিবস'
      : 'Estimated delivery: 2-4 business days',
    trackOrder: bn ? 'অর্ডার ট্র্যাক করুন' : 'Track order',
    continueShopping: bn ? 'আরও কেনাকাটা করুন' : 'Continue shopping',
    downloadInvoice: bn ? 'ইনভয়েস ডাউনলোড' : 'Download invoice',
    guestTip: bn
      ? 'অ্যাকাউন্ট খুললে সব অর্ডার এক জায়গায় ট্র্যাক করতে পারবেন।'
      : 'Create an account to track all your orders in one place.',
    createAccount: bn ? 'অ্যাকাউন্ট খুলুন' : 'Create account',
    loading: bn ? 'লোড হচ্ছে…' : 'Loading…',
    errorText: bn ? 'লোড করা যায়নি' : 'Could not load order',
    notFound: bn ? 'অর্ডার পাওয়া যায়নি' : 'Order not found',
    backHome: bn ? 'হোমে ফিরে যান' : 'Back to home',
  };

  if (!orderNumber || !phone) {
    return (
      <>
        <Breadcrumbs
          items={[
            { label: bn ? 'হোম' : 'Home', href: `/${locale}` },
            { label: bn ? 'অর্ডার নিশ্চিত' : 'Order Confirmed' },
          ]}
          locale={locale}
        />
        <main
          style={{
            maxWidth: 720,
            margin: '48px auto',
            padding: '0 24px',
            textAlign: 'center',
          }}
        >
          <h1>{bn ? 'অর্ডার তথ্য পাওয়া যায়নি' : 'Order info not found'}</h1>
          <p style={{ color: '#57606a' }}>
            {bn
              ? 'সঠিক লিংক ব্যবহার করে আবার চেষ্টা করুন — অথবা অ্যাকাউন্ট থেকে অর্ডার দেখুন।'
              : 'Use the correct link, or view your order from your account.'}
          </p>
          <Link
            href={`/${locale}`}
            style={{
              display: 'inline-block',
              marginTop: 16,
              padding: '10px 20px',
              background: '#FF8A1E',
              color: '#0C2B3D',
              borderRadius: 8,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            {bn ? 'হোমে ফিরে যান' : 'Back to home'}
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: bn ? 'হোম' : 'Home', href: `/${locale}` },
          { label: bn ? 'অর্ডার নিশ্চিত' : 'Order Confirmed' },
        ]}
        locale={locale}
      />
      <ConfirmationClient
        locale={locale}
        orderNumber={orderNumber}
        phone={phone}
        labels={labels}
      />
    </>
  );
}