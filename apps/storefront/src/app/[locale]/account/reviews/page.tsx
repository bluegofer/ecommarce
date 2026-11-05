import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { MyReviewsList } from '@/components/account';
import { isLocale, type Locale } from '@/lib/i18n';

export const metadata = {
  title: 'My Reviews | NoLimitShopping',
  robots: { index: false, follow: false },
};

export default function MyReviewsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const bn = locale === 'bn';

  return (
    <>
      <Breadcrumbs
        items={[
          { label: bn ? 'হোম' : 'Home', href: `/${locale}` },
          { label: bn ? 'অ্যাকাউন্ট' : 'Account', href: `/${locale}/account` },
          { label: bn ? 'আমার রিভিউ' : 'My reviews' },
        ]}
        locale={locale}
      />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 64px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 24 }}>
          {bn ? 'আমার রিভিউ' : 'My reviews'}
        </h1>
        <MyReviewsList locale={locale} />
      </div>
    </>
  );
}