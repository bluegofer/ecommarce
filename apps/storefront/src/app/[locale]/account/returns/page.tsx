import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import {
  ReturnsList,
  type ReturnsListLabels,
} from '@/components/account';
import { isLocale, type Locale } from '@/lib/i18n';

export const metadata = {
  title: 'Returns & Refunds | NoLimitShopping',
  robots: { index: false, follow: false },
};

export default function ReturnsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const bn = locale === 'bn';

  const labels: ReturnsListLabels = {
    title: bn ? 'ফেরত ও রিফান্ড' : 'Returns & Refunds',
    emptyTitle: bn ? 'কোনো ফেরত অনুরোধ নেই' : 'No return requests yet',
    emptyBody: bn
      ? 'ডেলিভারির পর ৭ দিনের মধ্যে অর্ডার থেকে ফেরত অনুরোধ করতে পারবেন।'
      : 'You can request a return from an order within 7 days of delivery.',
    findSomething: bn ? 'আমার অর্ডার দেখুন' : 'View my orders',
    orderLabel: bn ? 'অর্ডার' : 'Order',
    reasonLabel: bn ? 'কারণ' : 'Reason',
    refundLabel: bn ? 'রিফান্ড' : 'Refund',
    requestedLabel: bn ? 'অনুরোধ' : 'Requested',
    resolvedLabel: bn ? 'সমাধান' : 'Resolved',
    loading: bn ? 'লোড হচ্ছে…' : 'Loading…',
    errorText: bn ? 'লোড করা যায়নি' : 'Could not load returns',
    searchPlaceholder: bn ? 'কেস আইডি বা অর্ডার নম্বর দিয়ে খুঁজুন' : 'Search by case ID or order number',
    noMatchTitle: bn ? 'কোনো মিল পাওয়া যায়নি' : 'No matches found',
    noMatchBody: bn ? 'অন্য কিছু দিয়ে খুঁজে দেখুন।' : 'Try a different search term.',
    clearSearch: bn ? 'সার্চ মুছুন' : 'Clear search',
  };

  return (
    <>
      <Breadcrumbs
        items={[
          { label: bn ? 'হোম' : 'Home', href: `/${locale}` },
          { label: bn ? 'অ্যাকাউন্ট' : 'Account', href: `/${locale}/account` },
          { label: bn ? 'ফেরত' : 'Returns' },
        ]}
        locale={locale}
      />
      <ReturnsList locale={locale} labels={labels} />
    </>
  );
}