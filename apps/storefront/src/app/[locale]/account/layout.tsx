import { notFound } from 'next/navigation';
import { AccountLayoutClient, type AccountSidebarLabels } from '@/components/account';
import { isLocale, type Locale } from '@/lib/i18n';

export default function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const bn = locale === 'bn';

  const sidebarLabels: AccountSidebarLabels = {
    overview: bn ? 'সংক্ষিপ্ত' : 'Overview',
    orders: bn ? 'আমার অর্ডার' : 'Your Orders',
    wishlist: bn ? 'উইশলিস্ট' : 'Wishlist',
    addresses: bn ? 'ঠিকানা' : 'Addresses',
    settings: bn ? 'সেটিংস' : 'Settings',
    signOut: bn ? 'সাইন আউট' : 'Sign Out',
  };

  return (
    <AccountLayoutClient locale={locale} sidebarLabels={sidebarLabels}>
      {children}
    </AccountLayoutClient>
  );
}