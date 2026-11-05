'use client';

import Link from 'next/link';
import type { CartItem as CartItemType } from '@/lib/cart/context';
import { formatPoisha } from '@/lib/format/money';
import styles from './SaveForLater.module.css';

export interface SaveForLaterProps {
  items: CartItemType[];
  onMoveToCart: (variantId: string) => void;
  onRemove: (variantId: string) => void;
  locale: 'bn' | 'en';
  labels: {
    header: string; // "Saved for later ({n} items)"
    moveToCart: string;
    remove: string;
  };
}

export function SaveForLater({ items, onMoveToCart, onRemove, locale, labels }: SaveForLaterProps) {
  if (items.length === 0) return null;

  return (
    <details className={styles.wrap} open>
      <summary className={styles.header}>
        {labels.header.replace('{n}', String(items.length))}
        <span className={styles.chevron} aria-hidden="true">▾</span>
      </summary>

      <ul className={styles.list}>
        {items.map((it) => (
          <li key={it.variantId} className={styles.row}>
            <Link href={`/${locale}/p/${it.slug}`} className={styles.thumbLink}>
              {it.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.thumb} src={it.thumbnailUrl} alt="" width={72} height={72} />
              ) : (
                <span className={styles.thumbEmpty} aria-hidden="true" />
              )}
            </Link>
            <div className={styles.info}>
              <Link href={`/${locale}/p/${it.slug}`} className={styles.title}>{it.title}</Link>
              <div className={`${styles.price} sk-tabular`}>{formatPoisha(it.unitPricePoisha)}</div>
              <div className={styles.actions}>
                <button type="button" className={styles.primary} onClick={() => onMoveToCart(it.variantId)}>
                  {labels.moveToCart}
                </button>
                <button type="button" className={styles.link} onClick={() => onRemove(it.variantId)}>
                  {labels.remove}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}