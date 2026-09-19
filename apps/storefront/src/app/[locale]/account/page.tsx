import { notFound } from 'next/navigation';
import { AccountOverview, type AccountOverviewLabels } from '@/components/account';
import { isLocale, type Locale } from '@/lib/i18n';

export const metadata = {
  title: 'My Account | BlueGofer',
  robots: { index: false, follow: false },
};

export default function AccountPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const bn = locale === 'bn';

  const labels: AccountOverviewLabels = {
    greeting: bn ? 'স্বাগতম, {name}' : 'Welcome back, {name}',
    overview: bn ? 'আমার অ্যাকাউন্ট' : 'My Account',
    orders: bn ? 'অর্ডার' : 'Your Orders',
    ordersSub: bn ? 'ট্র্যাক, রিটার্ন বা আবার কিনুন' : 'Track, return, or buy again',
    addresses: bn ? 'ঠিকানা' : 'Your Addresses',
    addressesSub: bn ? 'ডেলিভারি ঠিকানা দেখুন ও সম্পাদনা করুন' : 'View and edit delivery addresses',
    settings: bn ? 'লগইন ও নিরাপত্তা' : 'Login & Security',
    settingsSub: bn ? 'প্রোফাইল ও পাসওয়ার্ড পরিবর্তন' : 'Edit profile and password',
    wishlist: bn ? 'উইশলিস্ট' : 'Wishlist',
    wishlistSub: bn ? 'পছন্দের পণ্য' : 'Your saved products',
    recentOrders: bn ? 'সাম্প্রতিক অর্ডার' : 'Recent Orders',
    viewAll: bn ? 'সব দেখুন →' : 'View all →',
    noOrders: bn ? 'এখনো কোনো অর্ডার নেই' : 'You have no orders yet',
    startShopping: bn ? 'কেনাকাটা শুরু করুন' : 'Start shopping',
    loading: bn ? 'লোড হচ্ছে…' : 'Loading…',
  };

  return <AccountOverview locale={locale} labels={labels} />;
}