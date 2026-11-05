import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ProductSummary } from '@/lib/api/types';
import type { Dictionary } from '@/lib/i18n';
import { ProductCard } from '@/components/product/ProductCard';
import styles from './NoResults.module.css';

export interface NoResultsProps {
  query?: string;
  recommended: ProductSummary[];
  locale: 'bn' | 'en';
  dict: Dictionary;
}

export function NoResults({ query, recommended, locale, dict }: NoResultsProps) {
  const title =
    locale === 'bn'
      ? query
        ? `"${query}" এর জন্য কোনো ফলাফল নেই`
        : 'কোনো ফলাফল নেই'
      : query
        ? `No results for "${query}"`
        : 'No results';

  const body =
    locale === 'bn'
      ? 'বানান পরীক্ষা করুন অথবা ফিল্টার কমান।'
      : 'Check spelling or try fewer filters.';

  return (
    <div className={styles.wrap}>
      <EmptyState
        title={title}
        body={body}
        illustration={<NoResultsIllustration />}
        action={
          <Link href={`/${locale}`} className={styles.homeLink}>
            {locale === 'bn' ? 'হোমে ফিরুন' : 'Back to home'}
          </Link>
        }
      />

      {recommended.length > 0 ? (
        <section className={styles.recommend}>
          <h3 className={styles.recommendTitle}>
            {locale === 'bn' ? 'এই পণ্যগুলো দেখুন' : 'You might like these'}
          </h3>
          <div className={styles.recommendGrid}>
            {recommended.slice(0, 3).map((p) => (
              <ProductCard
                key={p.id}
                variantId={p.variants?.[0]?.id ?? p.id}
                slug={p.slug}
                title={locale === 'bn' ? p.titleBn : p.titleEn}
                thumbnailUrl={p.primaryImageUrl ?? null}
                pricePoisha={p.minPricePoisha ?? p.variants?.[0]?.pricePoisha ?? 0}
                listPricePoisha={p.variants?.[0]?.compareAtPoisha ?? undefined}
                ratingAverage={Number(p.avgRating)}
                ratingCount={p.ratingCount}
                inStock={(p.totalStock ?? p.variants?.[0]?.stock ?? 1) > 0}
                locale={locale}
                t={{
                  addToCart: dict['card.add_to_cart'],
                  outOfStock: dict['product.out_of_stock'],
                  inStock: dict['product.in_stock'],
                  lowStock: dict['product.low_stock'],
                  freeDelivery: dict['product.free_delivery'],
                  deliveryBy: dict['product.eta'],
                  wishlistAdd: dict['card.wishlist_add'],
                  wishlistRemove: dict['card.wishlist_remove'],
                  addedToCart: dict['cart.added'],
                }}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function NoResultsIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M8.5 11h5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}