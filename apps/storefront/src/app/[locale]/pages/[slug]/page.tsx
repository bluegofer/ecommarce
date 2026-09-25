import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CmsPageRenderer, type CmsPageRendererLabels, ContactForm, type ContactFormLabels } from '@/components/content';
import { cmsApi, ApiError, type CmsPage } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/i18n';

interface PageProps {
  params: { locale: string; slug: string };
}

async function fetchPage(slug: string): Promise<CmsPage | null> {
  try {
    return await cmsApi.getPageBySlug(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = await fetchPage(params.slug);
  if (!page) return { title: 'Page Not Found | BlueGofer', robots: { index: false } };
  const title = params.locale === 'bn' ? page.titleBn : page.titleEn;
  return {
    title: `${title} | BlueGofer`,
    description: page.metaDescription ?? undefined,
  };
}

export const revalidate = 300;

export default async function CmsPageRoute({ params }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const bn = locale === 'bn';

  // Special case: slug "contact" renders the interactive ContactForm
  // instead of the CMS page body. The CMS page still exists (for SEO,
  // menu links, meta) but the actual form is the interactive component.
  if (params.slug === 'contact') {
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

  // Default: render CMS page content.
  const page = await fetchPage(params.slug);
  if (!page || page.status !== 'PUBLISHED') {
    notFound();
  }

  const labels: CmsPageRendererLabels = {
    lastUpdated: bn ? 'সর্বশেষ আপডেট: {date}' : 'Last updated: {date}',
    notFound: bn ? 'পৃষ্ঠাটি পাওয়া যায়নি' : 'Page not found',
  };

  return (
    <main>
      <CmsPageRenderer locale={locale} page={page} labels={labels} />
    </main>
  );
}