import { notFound } from 'next/navigation';
import { AuthProvider } from '@/lib/auth/context';
import { CartProvider } from '@/lib/cart/context';
import { SavedProvider } from '@/lib/cart/saved-context';
import { ToastProvider } from '@/lib/ui/toast-context';
import { ToastViewport } from '@/components/ui';
import { PopupDisplay } from '@/components/layout';
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
      <AuthProvider>
        <CartProvider>
          <SavedProvider>
            <ToastProvider>
              {children}
              <ToastViewport />
              <PopupDisplay locale={locale} />
            </ToastProvider>
          </SavedProvider>
        </CartProvider>
      </AuthProvider>
    </>
  );
}