import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { ProfileSettings, type ProfileSettingsLabels } from '@/components/account';
import { isLocale, type Locale } from '@/lib/i18n';

export const metadata = {
  title: 'Account Settings | NoLimitShopping',
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
    phoneChangeBtn: bn ? 'নম্বর পরিবর্তন করুন' : 'Change phone',
    phoneVerifyBtn: bn ? 'এখনই যাচাই করুন' : 'Verify now',
    phoneCancelBtn: bn ? 'বাতিল' : 'Cancel',
    phoneCurrentLabel: bn ? 'বর্তমান নম্বর' : 'Current phone',
    phoneNewLabel: bn ? 'নতুন মোবাইল নম্বর' : 'New phone number',
    phoneSendOtp: bn ? 'OTP পাঠান' : 'Send OTP',
    phoneOtpLabel: bn ? 'OTP কোড' : 'OTP code',
    phoneVerifyAction: bn ? 'যাচাই করে সংরক্ষণ করুন' : 'Verify & Save',
    phoneChangeSuccess: bn ? '✓ নম্বর পরিবর্তন হয়েছে' : '✓ Phone changed',
    phoneVerifySuccess: bn ? '✓ নম্বর যাচাই হয়েছে' : '✓ Phone verified',
    countryLabel: bn ? 'দেশ' : 'Country',
    save: bn ? 'সংরক্ষণ করুন' : 'Save',
    saving: bn ? 'সংরক্ষণ হচ্ছে…' : 'Saving…',
    saved: bn ? '✓ সংরক্ষিত' : '✓ Saved',
    sectionPassword: bn ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password',
    currentPassword: bn ? 'বর্তমান পাসওয়ার্ড' : 'Current password',
    newPassword: bn ? 'নতুন পাসওয়ার্ড' : 'New password',
    confirmPassword: bn ? 'নিশ্চিত করুন' : 'Confirm password',
    updatePassword: bn ? 'পাসওয়ার্ড আপডেট করুন' : 'Update password',
    passwordNote: bn ? 'কমপক্ষে ৮ অক্ষর, সংখ্যা ও অক্ষর মিশ্রিত' : 'At least 8 characters, mix letters and numbers',
    passwordGoogleNote: bn ? 'আপনি Google দিয়ে সাইন-ইন করেছেন — আলাদা পাসওয়ার্ড নেই।' : 'You signed in with Google — no separate password is set.',
    loading: bn ? 'লোড হচ্ছে…' : 'Loading…',
    errorText: bn ? 'লোড করা যায়নি' : 'Could not load',
    invalidEmail: bn ? 'সঠিক ইমেইল দিন' : 'Enter a valid email',
    weakPassword: bn ? 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষর' : 'Password must be at least 8 characters',
    passwordMismatch: bn ? 'পাসওয়ার্ড মিলছে না' : 'Passwords do not match',
    wrongCurrentPassword: bn ? 'বর্তমান পাসওয়ার্ড ভুল' : 'Current password is incorrect',
    otpInvalid: bn ? 'OTP কোড সঠিক নয় বা মেয়াদোত্তীর্ণ' : 'Invalid or expired OTP',
    otpSent: bn ? 'আপনার নম্বরে OTP পাঠানো হয়েছে' : 'OTP sent to your phone',
    invalidPhone: bn ? 'সঠিক মোবাইল নম্বর দিন' : 'Enter a valid phone number',
    samePhone: bn ? 'নতুন নম্বর বর্তমানের মতোই' : 'New phone is the same as current',
    phoneTaken: bn ? 'এই নম্বরটি ইতিমধ্যে অন্য অ্যাকাউন্টে ব্যবহৃত' : 'This phone is already registered',
  };

  return (
    <>
      <Breadcrumbs
        items={[
          { label: bn ? 'হোম' : 'Home', href: `/${locale}` },
          { label: bn ? 'লগইন ও নিরাপত্তা' : 'Login & Security' },
        ]}
        locale={locale}
      />
      <ProfileSettings locale={locale} labels={labels} />
    </>
  );
}