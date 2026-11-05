import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n';
import { GoogleCallbackClient } from './GoogleCallbackClient';

export const metadata = {
  title: 'Signing In | NoLimitShopping',
  robots: { index: false, follow: false },
};

export default function GoogleCallbackPage({
  params,
}: {
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;

  return (
    <Suspense fallback={<main style={{ padding: 24, textAlign: 'center' }}>...</main>}>
      <GoogleCallbackClient locale={locale} />
    </Suspense>
  );
}