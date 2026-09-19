import { notFound } from 'next/navigation';
import { ProfileSettings, type ProfileSettingsLabels } from '@/components/account';
import { isLocale, type Locale } from '@/lib/i18n';

export const metadata = {
  title: 'Account Settings | BlueGofer',
  robots: { index: false, follow: false },
};

export default function SettingsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const bn = locale === 'bn';

  const labels: ProfileSettingsLabels = {
    title: bn ? 'লগইন ও নিরাপত্তা' : 'Login & Security',
    sectionProfile: bn ? 'প্রোফাইল' : 'Profile',
    fullName: bn ? 'পূর্ণ নাম' : 'Full name',
    email: bn ? 'ইমেইল' : 'Email',
    phone: bn ? 'মোবাইল নম্বর' : 'Mobile number',
    phoneVerified: bn ? 'যাচাইকৃত' : 'Verified',
    phoneNotVerified: bn ? 'অযাচাইকৃত' : 'Not verified',
    save: bn ? 'সংরক্ষণ করুন' : 'Save',
    saving: bn ? 'সংরক্ষণ হচ্ছে…' : 'Saving…',
    saved: bn ? '✓ সংরক্ষিত' : '✓ Saved',
    sectionPassword: bn ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password',
    newPassword: bn ? 'নতুন পাসওয়ার্ড' : 'New password',
    confirmPassword: bn ? 'নিশ্চিত করুন' : 'Confirm password',
    updatePassword: bn ? 'পাসওয়ার্ড আপডেট করুন' : 'Update password',
    passwordNote: bn ? 'কমপক্ষে ৮ অক্ষর, সংখ্যা ও অক্ষর মিশ্রিত' : 'At least 8 characters, mix letters and numbers',
    loading: bn ? 'লোড হচ্ছে…' : 'Loading…',
    errorText: bn ? 'লোড করা যায়নি' : 'Could not load',
    invalidEmail: bn ? 'সঠিক ইমেইল দিন' : 'Enter a valid email',
    weakPassword: bn ? 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষর' : 'Password must be at least 8 characters',
    passwordMismatch: bn ? 'পাসওয়ার্ড মিলছে না' : 'Passwords do not match',
  };

  return <ProfileSettings locale={locale} labels={labels} />;
}