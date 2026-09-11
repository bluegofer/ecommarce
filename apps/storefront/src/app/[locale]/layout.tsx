import { notFound } from 'next/navigation';
import { CartProvider } from '@/lib/cart/context';
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
  if (!isLocale(params.locale)) notFound();
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
        <ToastProvider>
          {children}
          <ToastViewport />
        </ToastProvider>
      </CartProvider>
    </>
  );
}