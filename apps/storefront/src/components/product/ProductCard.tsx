'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { PriceBlock } from '@/components/ui/PriceBlock';
import { RatingStars } from '@/components/ui/RatingStars';
import { useCart } from '@/lib/cart/context';
import { useToast } from '@/lib/ui/toast-context';
import { track } from '@/lib/analytics/events';
import styles from './ProductCard.module.css';

export interface ProductCardProps {
  /** Product/variant identifiers. */
  variantId: string;
  slug: string;
  title: string;
  thumbnailUrl: string | null;

  /** Money in poisha (integer). */
  pricePoisha: number;
  listPricePoisha?: number;

  /** Rating block. */
  ratingAverage: number;
  ratingCount: number;

  /** Stock + delivery. */
  inStock: boolean;
  lowStock?: boolean;
  lowStockQty?: number;
  freeDelivery?: boolean;
  deliveryEta?: string; // pre-formatted date string
  sellerName?: string | null;

  /** Badges (mutually exclusive — order matters: deal > best-seller > new). */
  bestSeller?: boolean;
  isNew?: boolean;

  /** Locale for labels. */
  locale: 'bn' | 'en';
  /** i18n dictionary (see lib/i18n/index.ts). */
  t: {
    addToCart: string;
    outOfStock: string;
    inStock: string;
    lowStock: string;      // with {n}
    freeDelivery: string;
    deliveryBy: string;    // with {date}
    wishlistAdd: string;
    wishlistRemove: string;
    addedToCart: string;
  };
}

export function ProductCard(props: ProductCardProps) {
  const {
    variantId, slug, title, thumbnailUrl,
    pricePoisha, listPricePoisha,
    ratingAverage, ratingCount,
    inStock, lowStock, lowStockQty,
    freeDelivery, deliveryEta, sellerName,
    bestSeller, isNew,
    locale, t,
  } = props;

  const [wishlisted, setWishlisted] = useState(false);
  const { addItem } = useCart();
  const { show: showToast } = useToast();

  const handleAdd = () => {
    if (!inStock) return;
    addItem({
      variantId,
      slug,
      title,
      thumbnailUrl,
      variantLabel: null,
      unitPricePoisha: pricePoisha,
      qty: 1,
      stockAvailable: 999,
      sellerName: sellerName ?? null,
    });
    track('ADD_TO_CART', { productSlug: slug, unitPricePoisha: pricePoisha });
    showToast({
      kind: 'success',
      title: t.addedToCart,
      description: title,
      thumbnailUrl,
    });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlisted((v) => !v);
  };

  const detailHref = `/${locale}/p/${slug}`;

  return (
    <article className={[styles.card, !inStock ? styles.outOfStock : ''].filter(Boolean).join(' ')}>
      <Link href={detailHref} className={styles.imageLink} aria-label={title}>
        <div className={styles.imageWrap}>
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt={`${title} — front view`} className={styles.image} width={400} height={400} loading="lazy" />
          ) : (
            <span className={styles.imagePlaceholder} aria-hidden="true">
              <CameraIcon />
            </span>
          )}

          <div className={styles.badges}>
            {bestSeller ? <Badge kind="best-seller">{t.addToCart /* placeholder until EN label */ && 'Best Seller'}</Badge> : null}
            {isNew ? <Badge kind="new">{'New'}</Badge> : null}
            {!inStock ? <Badge kind="out-of-stock">{t.outOfStock}</Badge> : null}
            {inStock && lowStock && lowStockQty ? (
              <Badge kind="low-stock">{t.lowStock.replace('{n}', String(lowStockQty))}</Badge>
            ) : null}
          </div>

          <button
            type="button"
            className={[styles.heart, wishlisted ? styles.heartActive : ''].filter(Boolean).join(' ')}
            onClick={handleWishlist}
            aria-label={wishlisted ? t.wishlistRemove : t.wishlistAdd}
            aria-pressed={wishlisted}
          >
            <HeartIcon filled={wishlisted} />
          </button>
        </div>
      </Link>

      <div className={styles.body}>
        <Link href={detailHref} className={styles.title}>{title}</Link>

        <div className={styles.ratingRow}>
          <RatingStars average={ratingAverage} count={ratingCount} size={16} countHref={`${detailHref}#reviews`} locale={locale} />
        </div>

        <div className={styles.priceRow}>
          <PriceBlock pricePoisha={pricePoisha} listPricePoisha={listPricePoisha} size="card" locale={locale} />
        </div>

        <div className={styles.deliveryRow}>
          {freeDelivery ? (
            <span className={styles.freeDelivery}>
              <TruckIcon /> {t.freeDelivery}
            </span>
          ) : deliveryEta ? (
            <span className={styles.deliveryEta}>{t.deliveryBy.replace('{date}', deliveryEta)}</span>
          ) : null}
        </div>

        <button
          type="button"
          className={styles.addBtn}
          onClick={handleAdd}
          disabled={!inStock}
        >
          {inStock ? t.addToCart : t.outOfStock}
        </button>
      </div>
    </article>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'var(--sk-heart)' : 'none'} aria-hidden="true">
      <path
        d="M12 21s-7-4.35-9.5-9.1A5.5 5.5 0 0 1 12 5.5a5.5 5.5 0 0 1 9.5 6.4C19 16.65 12 21 12 21z"
        stroke="var(--sk-heart)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 7h11v9H3zM14 11h5l2 3v2h-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="7" cy="18" r="1.6" fill="currentColor" />
      <circle cx="17" cy="18" r="1.6" fill="currentColor" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}