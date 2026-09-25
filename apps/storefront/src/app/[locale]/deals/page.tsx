import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { DealsClient, type DealsLabels } from '@/components/deals';
import { isLocale, type Locale } from '@/lib/i18n';

export const metadata = {
  title: "Today's Deals | NoLimitShopping",
  description: 'Fresh discounts every hour on NoLimitShopping.',
};

// Step 14.2 — ISR: deals page is fully cacheable (server-synced countdown
// comes from CMS config). Refresh every 5 minutes; admin publish triggers
// on-demand revalidation via /api/revalidate.
export const revalidate = 300;

export default function DealsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const bn = locale === 'bn';

  const labels: DealsLabels = {
    title: bn ? "আজকের অফার" : "Today's Deals",
    subtitle: bn ? 'প্রতি ঘণ্টায় নতুন ডিসকাউন্ট — শেষ হওয়ার আগেই নিন' : 'Fresh discounts every hour — grab them before they\'re gone',
    filterAll: bn ? 'সব ডিল' : 'All Deals',
    filterLightning: bn ? 'লাইটনিং ডিল' : 'Lightning Deals',
    filterDealOfDay: bn ? 'ডিল অফ দ্য ডে' : 'Deal of the Day',
    filterFlash: bn ? 'ফ্ল্যাশ সেল' : 'Flash Sales',
    showingCount: bn ? '{n}টি ডিল' : '{n} deals',
    loadMore: bn ? 'আরো দেখুন' : 'Load more',
    emptyTitle: bn ? 'এখন কোনো ডিল নেই' : 'No deals right now',
    emptyBody: bn ? 'পরে আবার আসুন — শীঘ্রই নতুন অফার' : 'Check back soon — fresh offers coming',
    backHome: bn ? 'হোমে যান' : 'Go to Home',
    loading: bn ? 'লোড হচ্ছে…' : 'Loading…',
    errorText: bn ? 'লোড করা যায়নি' : 'Could not load deals',
    claimDeal: bn ? 'নিন' : 'Claim',
    claimedLabel: bn ? 'দাবি করা হয়েছে' : 'claimed',
    soldOut: bn ? 'শেষ' : 'Sold out',
    ended: bn ? 'শেষ হয়েছে' : 'Ended',
  };

  return <DealsClient locale={locale} labels={labels} />;
}