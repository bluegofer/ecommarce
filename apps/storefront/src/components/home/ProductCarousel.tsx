import Link from 'next/link';
import { ProductCard } from '@/components/product/ProductCard';
import type { ProductSummary } from '@/lib/api/types';
import type { Dictionary } from '@/lib/i18n';
import styles from './ProductCarousel.module.css';

export interface ProductCarouselProps {
  title: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  products: ProductSummary[];
  locale: 'bn' | 'en';
  dict: Dictionary;
}

/**
 * Horizontal scroll-snap carousel. Server-renderable (no client JS needed for
 * scroll; arrows are visual only on desktop via CSS, actual scroll by touch/wheel).
 * Arrows via CSS scroll-behavior; keyboard users tab through cards.
 */
export function ProductCarousel({
  title,
  seeAllHref,
  seeAllLabel,
  products,
  locale,
  dict,
}: ProductCarouselProps) {
  if (products.length === 0) return null;

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {seeAllHref && seeAllLabel ? (
          <Link href={seeAllHref} className={styles.seeAll}>{seeAllLabel}</Link>
        ) : null}
      </header>

      <div className={styles.scroll}>
        {products.map((p) => (
          <div key={p.id} className={styles.item}>
            <ProductCard
              variantId={p.variants?.[0]?.id ?? p.id}
              slug={p.slug}
              title={locale === 'bn' ? p.titleBn : p.titleEn}
              thumbnailUrl={p.primaryImageUrl ?? null}
              pricePoisha={p.minPricePoisha ?? p.variants?.[0]?.pricePoisha ?? 0}
              listPricePoisha={p.maxCompareAtPoisha ?? p.variants?.[0]?.compareAtPoisha ?? undefined}
              ratingAverage={Number(p.avgRating)}
              ratingCount={p.ratingCount}
              inStock={(p.totalStock ?? p.variants?.[0]?.stock ?? 0) > 0}
              lowStock={(p.totalStock ?? p.variants?.[0]?.stock ?? 0) <= 5 && (p.totalStock ?? p.variants?.[0]?.stock ?? 0) > 0}
              lowStockQty={p.totalStock ?? p.variants?.[0]?.stock ?? 0}
              freeDelivery={Boolean(p.brand)}
              bestSeller={p.soldCount > 3000}
              isNew={Boolean(p.publishedAt && Date.now() - new Date(p.publishedAt).getTime() < 30 * 24 * 60 * 60 * 1000)}
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
          </div>
        ))}
      </div>
    </section>
  );
}