import { notFound } from 'next/navigation';
import { RegisterForm, type RegisterLabels } from '@/components/auth';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';

export const metadata = {
  title: 'Create Account | SkyMart',
  robots: { index: false, follow: true },
};

export default function RegisterPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);

  const labels: RegisterLabels = {
    title: dict['auth.signup'],
    fullName: dict['auth.full_name'],
    phone: dict['auth.phone_label'],
    emailOptional: dict['auth.email_optional'],
    password: dict['auth.password'],
    confirmPassword: dict['auth.confirm_password'],
    consent: dict['auth.consent'],
    submit: dict['auth.signup'],
    haveAccount: dict['auth.have_account'],
    signin: dict['auth.signin'],
    otpTitle: dict['auth.otp_title'],
    otpSentTemplate: dict['auth.otp_sent'],
    otpResend: dict['auth.otp_resend'],
    otpResendNow: dict['auth.otp_resend_now'],
    verify: dict['auth.verify'],
    back: dict['auth.back'],
    strength: {
      weak: locale === 'bn' ? 'দুর্বল' : 'Weak',
      fair: locale === 'bn' ? 'মাঝারি' : 'Fair',
      strong: locale === 'bn' ? 'শক্তিশালী' : 'Strong',
    },
    errors: {
      generic: dict['auth.error.generic'],
      invalidPhone: dict['auth.error.invalid_phone'],
      weakPassword: dict['auth.error.weak_password'],
      passwordMismatch: dict['auth.error.password_mismatch'],
      required: dict['auth.error.required'],
      otpInvalid: dict['auth.error.otp_invalid'],
      consentRequired: dict['auth.error.consent_required'],
    },
  };

  return (
    <main style={{ padding: '24px 16px', minHeight: '60vh' }}>
      <RegisterForm locale={locale} labels={labels} />
    </main>
  );
}