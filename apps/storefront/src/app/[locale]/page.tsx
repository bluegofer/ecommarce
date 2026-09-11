import { getDictionary, isLocale } from '@/lib/i18n';
import { notFound } from 'next/navigation';

export default function LocaleHomePage({
  params,
}: {
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const t = getDictionary(params.locale);

  return (
    <main style={{ padding: 24, fontFamily: 'var(--sk-font-en)' }}>
      <h1 style={{ color: 'var(--sk-ink)', marginBottom: 8 }}>SkyMart</h1>
      <p style={{ color: 'var(--sk-muted)' }}>
        Step 7 placeholder home — locale = <strong>{params.locale}</strong>
      </p>
      <p style={{ color: 'var(--sk-muted)', marginTop: 8 }}>
        i18n smoke test: <strong>{t['nav.deals']}</strong> · <strong>{t['cart.title']}</strong>
      </p>
    </main>
  );
}