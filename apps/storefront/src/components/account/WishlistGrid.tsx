'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getAll as getWishlist,
  remove as removeFromWishlist,
  type WishlistEntry,
} from '@/lib/wishlist/storage';
import styles from './WishlistGrid.module.css';

export interface WishlistGridLabels {
  title: string;
  countLabel: string;
  emptyTitle: string;
  emptyBody: string;
  moveToCart: string;
  remove: string;
  findSomething: string;
}

export interface WishlistGridProps {
  locale: 'bn' | 'en';
  labels: WishlistGridLabels;
}

export function WishlistGrid({ locale, labels }: WishlistGridProps) {
  const [items, setItems] = useState<WishlistEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(getWishlist());
    setHydrated(true);
    const onChange = () => setItems(getWishlist());
    window.addEventListener('skymart:wishlist-changed', onChange);
    return () => window.removeEventListener('skymart:wishlist-changed', onChange);
  }, []);

  const fmtPrice = (poisha: number) =>
    `৳${(poisha / 100).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD')}`;

  const handleRemove = (productId: string) => {
    removeFromWishlist(productId);
    setItems(getWishlist());
  };

  if (!hydrated) return null;

  if (items.length === 0) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.h1}>{labels.title}</h1>
        <div className={styles.empty}>
          <div className={styles.emptyIcon} aria-hidden="true">
            <HeartIcon />
          </div>
          <h2 className={styles.emptyTitle}>{labels.emptyTitle}</h2>
          <p className={styles.emptyBody}>{labels.emptyBody}</p>
          <Link href={`/${locale}`} className={styles.cta}>{labels.findSomething}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <h1 className={styles.h1}>{labels.title}</h1>
        <span className={styles.count}>{labels.countLabel.replace('{n}', String(items.length))}</span>
      </header>

      <ul className={styles.grid}>
        {items.map((it) => {
          const title = locale === 'bn' ? it.titleBn : it.titleEn;
          return (
            <li key={it.productId} className={styles.card}>
              <Link href={`/${locale}/p/${it.slug}`} className={styles.imgLink}>
                <div className={styles.img}>
                  {it.imageUrl ? (
                    <img src={it.imageUrl} alt={title} loading="lazy" />
                  ) : (
                    <div className={styles.imgPlaceholder} />
                  )}
                </div>
              </Link>
              <div className={styles.info}>
                <Link href={`/${locale}/p/${it.slug}`} className={styles.cardTitle}>
                  {title}
                </Link>
                <span className={styles.price}>{fmtPrice(it.minPricePoisha)}</span>
              </div>
              <div className={styles.actions}>
                <Link href={`/${locale}/p/${it.slug}`} className={styles.moveBtn}>
                  {labels.moveToCart}
                </Link>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => handleRemove(it.productId)}
                  aria-label={labels.remove}
                >
                  <TrashIcon />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function HeartIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s-7-4.5-9-9a5 5 0 019-4 5 5 0 019 4c-2 4.5-9 9-9 9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}