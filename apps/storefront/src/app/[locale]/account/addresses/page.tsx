import { notFound } from 'next/navigation';
import { AddressBook, type AddressBookLabels } from '@/components/account';
import { isLocale, type Locale } from '@/lib/i18n';

export const metadata = {
  title: 'Your Addresses | SkyMart',
  robots: { index: false, follow: false },
};

export default function AddressesPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const bn = locale === 'bn';

  const labels: AddressBookLabels = {
    title: bn ? 'আমার ঠিকানা' : 'Your Addresses',
    addNew: bn ? 'নতুন ঠিকানা যোগ করুন' : 'Add new address',
    edit: bn ? 'সম্পাদনা' : 'Edit',
    remove: bn ? 'মুছুন' : 'Delete',
    setDefault: bn ? 'ডিফল্ট করুন' : 'Set default',
    defaultBadge: bn ? 'ডিফল্ট' : 'Default',
    save: bn ? 'সংরক্ষণ করুন' : 'Save',
    cancel: bn ? 'বাতিল' : 'Cancel',
    confirmDelete: bn ? 'এই ঠিকানাটি মুছবেন?' : 'Delete this address?',
    emptyTitle: bn ? 'এখনো কোনো ঠিকানা নেই' : 'No addresses yet',
    emptyBody: bn ? 'চেকআউট দ্রুত করতে একটি ঠিকানা যোগ করুন' : 'Add an address to speed up checkout',
    loading: bn ? 'লোড হচ্ছে…' : 'Loading…',
    errorText: bn ? 'ঠিকানা লোড করা যায়নি' : 'Could not load addresses',
    form: {
      label: bn ? 'লেবেল (যেমন বাসা, অফিস)' : 'Label (e.g. Home, Office)',
      recipientName: bn ? 'প্রাপকের নাম' : 'Recipient name',
      phone: bn ? 'মোবাইল নম্বর' : 'Mobile number',
      area: bn ? 'এলাকা' : 'Area',
      city: bn ? 'শহর' : 'City',
      postcode: bn ? 'পোস্ট কোড' : 'Postcode',
      line1: bn ? 'ঠিকানা লাইন ১' : 'Address line 1',
      line2: bn ? 'ঠিকানা লাইন ২' : 'Address line 2',
      isDefault: bn ? 'ডিফল্ট ঠিকানা হিসেবে সেট করুন' : 'Set as default address',
    },
  };

  return <AddressBook locale={locale} labels={labels} />;
}