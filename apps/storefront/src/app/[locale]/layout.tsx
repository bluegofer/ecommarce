import { notFound } from 'next/navigation';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';

export function generateStaticParams() {
  return [{ locale: 'bn' }, { locale: 'en' }];
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) {
    notFound();
  }
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);
  void dict; // dictionary is consumed by child pages/components

  return (
    <>
      {/* Sync <html lang> + <html dir> with the actual locale.
          Root layout hardcodes "bn"; this script corrects it after hydration
          and also on full page reloads (runs before paint). */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang = ${JSON.stringify(locale)};`,
        }}
      />
      {children}
    </>
  );
}