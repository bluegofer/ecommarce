'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart/context';
import { formatPoisha } from '@/lib/format/money';
import styles from './MiniCart.module.css';

export interface MiniCartLabels {
  title: string;
  subtotal: string;   // "Subtotal ({n} items)" — caller interpolates n
  viewCart: string;
  checkout: string;
  empty: string;
}

export interface MiniCartProps {
  locale: string;
  labels: MiniCartLabels;
}

/**
 * Mini-cart flyout (UI Spec B5). Renders the last 3 items.
 * Presentational — caller decides when/where to render (hover on cart icon).
 */
export function MiniCart({ locale, labels }: MiniCartProps) {
  const { items, unitCount, subtotalPoisha, hydrated } = useCart();

  if (!hydrated) return null;

  if (items.length === 0) {
    return (
      <div className={styles.wrap} role="dialog" aria-label={labels.title}>
        <div className={styles.empty}>{labels.empty}</div>
        <div className={styles.actions}>
          <Link className={styles.secondary} href={`/${locale}/cart`}>{labels.viewCart}</Link>
        </div>
      </div>
    );
  }

  const preview = items.slice(0, 3);
  const subtotalLabel = labels.subtotal.replace('{n}', String(unitCount));

  return (
    <div className={styles.wrap} role="dialog" aria-label={labels.title}>
      <div className={styles.list}>
        {preview.map((it) => (
          <div key={it.variantId} className={styles.row}>
            {it.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.thumb} src={it.thumbnailUrl} alt="" width={56} height={56} />
            ) : (
              <span className={styles.thumbPlaceholder} aria-hidden="true" />
            )}
            <div className={styles.rowBody}>
              <Link href={`/${locale}/p/${it.slug}`} className={styles.rowTitle}>
                {it.title}
              </Link>
              <div className={styles.rowMeta}>
                <span className="sk-tabular">×{it.qty}</span>
                <span className={`${styles.rowPrice} sk-tabular`}>{formatPoisha(it.unitPricePoisha * it.qty)}</span>
              </div>
            </div>
          </div>
        ))}
        {items.length > 3 ? (
          <div className={styles.more}>+{items.length - 3} more</div>
        ) : null}
      </div>

      <div className={styles.subtotalRow}>
        <span>{subtotalLabel}</span>
        <span className={`${styles.subtotalValue} sk-tabular`}>{formatPoisha(subtotalPoisha)}</span>
      </div>

      <div className={styles.actions}>
        <Link className={styles.secondary} href={`/${locale}/cart`}>{labels.viewCart}</Link>
        <Link className={styles.money} href={`/${locale}/checkout`}>{labels.checkout}</Link>
      </div>
    </div>
  );
}