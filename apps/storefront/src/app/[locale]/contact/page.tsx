import { notFound } from 'next/navigation';
import { ContactForm, type ContactFormLabels } from '@/components/content';
import { isLocale, type Locale } from '@/lib/i18n';

export const metadata = {
  title: 'Contact Us | BlueGofer',
  description: 'Contact BlueGofer customer service — 24/7 support for orders, returns, and product questions.',
};

export default function ContactPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const bn = locale === 'bn';

  const labels: ContactFormLabels = {
    name: bn ? 'আপনার নাম' : 'Your name',
    email: bn ? 'ইমেইল' : 'Email',
    orderNo: bn ? 'অর্ডার নম্বর (ঐচ্ছিক)' : 'Order number (optional)',
    subject: bn ? 'বিষয়' : 'Subject',
    subjectGeneral: bn ? 'সাধারণ জিজ্ঞাসা' : 'General question',
    subjectOrder: bn ? 'অর্ডার সংক্রান্ত' : 'About an order',
    subjectReturn: bn ? 'রিটার্ন / রিফান্ড' : 'Return / Refund',
    subjectOther: bn ? 'অন্যান্য' : 'Other',
    message: bn ? 'বার্তা' : 'Message',
    submit: bn ? 'পাঠান' : 'Send message',
    submitting: bn ? 'পাঠানো হচ্ছে…' : 'Sending…',
    successToast: bn ? '✓ বার্তা পাঠানো হয়েছে — শীঘ্রই যোগাযোগ করব' : "✓ Message sent — we'll reply soon",
    errorText: bn ? 'পাঠানো যায়নি, আবার চেষ্টা করুন' : 'Could not send — please try again',
    hotlineTitle: bn ? 'হটলাইন' : 'Hotline',
    hotlineBody: bn ? '১৬-২৬৩ · সকাল ৮টা - রাত ১০টা' : '16-263 · 8am – 10pm daily',
    emailTitle: bn ? 'ইমেইল' : 'Email',
    emailBody: bn ? 'cloud.bluegofer@gmail.com' : 'cloud.bluegofer@gmail.com',
    whatsappTitle: bn ? 'হোয়াটসঅ্যাপ' : 'WhatsApp',
    whatsappBody: bn ? '+880 1XXX-XXXXXX' : '+880 1XXX-XXXXXX',
  };

  return (
    <main>
      <h1 style={{ maxWidth: 1080, margin: '32px auto 0', padding: '0 24px', fontSize: 28, fontWeight: 700 }}>
        {bn ? 'যোগাযোগ করুন' : 'Contact Us'}
      </h1>
      <ContactForm labels={labels} />
    </main>
  );
}