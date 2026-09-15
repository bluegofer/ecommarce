import { notFound } from 'next/navigation';
import { SignInForm, type SignInLabels } from '@/components/auth';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';

export const metadata = {
  title: 'Sign In | SkyMart',
  robots: { index: false, follow: true },
};

export default function SignInPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { next?: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);

  const labels: SignInLabels = {
    title: dict['auth.signin'],
    phone: dict['auth.phone'],
    password: dict['auth.password'],
    submit: dict['auth.signin'],
    forgot: dict['auth.forgot'],
    newCustomer: dict['auth.new_customer'],
    signup: dict['auth.signup'],
    errors: {
      generic: dict['auth.error.generic'],
      invalidCredentials: dict['auth.error.invalid_credentials'],
      invalidPhone: dict['auth.error.invalid_phone'],
      required: dict['auth.error.required'],
    },
  };

  return (
    <main style={{ padding: '24px 16px', minHeight: '60vh' }}>
      <SignInForm locale={locale} labels={labels} next={searchParams.next} />
    </main>
  );
}