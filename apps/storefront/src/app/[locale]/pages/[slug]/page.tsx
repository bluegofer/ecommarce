import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CmsPageRenderer, type CmsPageRendererLabels } from '@/components/content';
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
  const page = await fetchPage(params.slug);

  if (!page || page.status !== 'PUBLISHED') {
    notFound();
  }

  const bn = locale === 'bn';
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