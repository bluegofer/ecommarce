import { notFound } from 'next/navigation';
import { CartProvider } from '@/lib/cart/context';
import { SavedProvider } from '@/lib/cart/saved-context';
import { ToastProvider } from '@/lib/ui/toast-context';
import { ToastViewport } from '@/components/ui';
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
  // NOTE: notFound() is NOT allowed in a layout that wraps root — Next.js will
  // throw "notFound() is not allowed to use in root layout". Instead, child pages
  // validate the locale param themselves. If it's invalid here, just render
  // nothing (the 404 boundary in the parent app/layout.tsx will handle it).
  if (!isLocale(params.locale)) {
    return null;
  }
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);
  void dict;

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang = ${JSON.stringify(locale)};`,
        }}
      />
      <CartProvider>
        <SavedProvider>
          <ToastProvider>
            {children}
            <ToastViewport />
          </ToastProvider>
        </SavedProvider>
      </CartProvider>
    </>
  );
}