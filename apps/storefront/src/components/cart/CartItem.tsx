'use client';

import Link from 'next/link';
import type { CartItem as CartItemType } from '@/lib/cart/context';
import { formatPoisha } from '@/lib/format/money';
import { QtyStepper } from '@/components/pdp/QtyStepper';
import styles from './CartItem.module.css';

export interface CartItemProps {
  item: CartItemType;
  /** Whether item is selected for checkout. */
  selected: boolean;
  onToggleSelect: (variantId: string) => void;
  onQtyChange: (variantId: string, qty: number) => void;
  onRemove: (variantId: string) => void;
  onSaveForLater: (variantId: string) => void;
  locale: 'bn' | 'en';
  labels: {
    remove: string;
    saveLater: string;
    inStock: string;
    lowStock: string; // {n}
    outOfStock: string;
    qty: string;
  };
}

export function CartItem({
  item,
  selected,
  onToggleSelect,
  onQtyChange,
  onRemove,
  onSaveForLater,
  locale,
  labels,
}: CartItemProps) {
  const detailHref = `/${locale}/p/${item.slug}`;
  const inStock = item.stockAvailable > 0;
  const lowStock = inStock && item.stockAvailable <= 5;

  return (
    <div className={styles.row}>
      <label className={styles.checkWrap}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(item.variantId)}
          aria-label={locale === 'bn' ? 'সিলেক্ট করুন' : 'Select for checkout'}
        />
      </label>

      <Link href={detailHref} className={styles.thumbLink}>
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.thumb} src={item.thumbnailUrl} alt="" width={100} height={100} />
        ) : (
          <span className={styles.thumbEmpty} aria-hidden="true" />
        )}
      </Link>

      <div className={styles.info}>
        <Link href={detailHref} className={styles.title}>{item.title}</Link>
        {item.variantLabel ? <div className={styles.variant}>{item.variantLabel}</div> : null}
        <div className={styles.stockLine}>
          {!inStock
            ? <span className={styles.stockOut}>{labels.outOfStock}</span>
            : lowStock
              ? <span className={styles.stockLow}>{labels.lowStock.replace('{n}', String(item.stockAvailable))}</span>
              : <span className={styles.stockOk}>✓ {labels.inStock}</span>}
        </div>

        <div className={styles.actionsRow}>
          <button type="button" className={styles.linkBtn} onClick={() => onRemove(item.variantId)}>
            {labels.remove}
          </button>
          <span className={styles.dot}>·</span>
          <button type="button" className={styles.linkBtn} onClick={() => onSaveForLater(item.variantId)}>
            {labels.saveLater}
          </button>
        </div>
      </div>

      <div className={styles.right}>
        <QtyStepper
          value={item.qty}
          max={Math.max(1, item.stockAvailable)}
          onChange={(next) => onQtyChange(item.variantId, next)}
          label={labels.qty}
        />
        <div className={`${styles.linePrice} sk-tabular`}>
          {formatPoisha(item.unitPricePoisha * item.qty)}
        </div>
      </div>
    </div>
  );
}