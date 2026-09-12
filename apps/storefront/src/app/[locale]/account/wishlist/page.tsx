import { notFound } from 'next/navigation';
import { WishlistGrid, type WishlistGridLabels } from '@/components/account';
import { isLocale, type Locale } from '@/lib/i18n';

export const metadata = {
  title: 'Wishlist | SkyMart',
  robots: { index: false, follow: false },
};

export default function WishlistPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const bn = locale === 'bn';

  const labels: WishlistGridLabels = {
    title: bn ? 'আমার উইশলিস্ট' : 'My Wishlist',
    countLabel: bn ? '{n}টি পণ্য' : '{n} items',
    emptyTitle: bn ? 'উইশলিস্ট খালি' : 'Your wishlist is empty',
    emptyBody: bn ? 'পছন্দের পণ্য সংরক্ষণ করুন' : 'Save products you love to find them here later',
    moveToCart: bn ? 'কার্টে নিন' : 'Move to Cart',
    remove: bn ? 'সরান' : 'Remove',
    findSomething: bn ? 'পছন্দের কিছু খুঁজুন' : 'Find something you like',
  };

  return <WishlistGrid locale={locale} labels={labels} />;
}