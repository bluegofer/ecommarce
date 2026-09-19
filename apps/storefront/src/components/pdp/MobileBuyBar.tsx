'use client';

import { useCart } from '@/lib/cart/context';
import { useToast } from '@/lib/ui/toast-context';
import { formatPoisha } from '@/lib/format/money';
import { track } from '@/lib/analytics/events';
import styles from './MobileBuyBar.module.css';

export interface MobileBuyBarProps {
  productId: string;
  variantId: string | null;
  slug: string;
  title: string;
  thumbnailUrl: string | null;
  pricePoisha: number;
  stock: number;
  sellerName?: string | null;
  locale: 'bn' | 'en';
  labels: {
    addToCart: string;
    outOfStock: string;
    addedToCart: string;
  };
}

/**
 * Mobile-only sticky bottom buy bar (UI Spec C3).
 * Hidden above 640px via CSS; appears only when a variant is in stock.
 */
export function MobileBuyBar({
  productId,
  variantId,
  slug,
  title,
  thumbnailUrl,
  pricePoisha,
  stock,
  sellerName,
  labels,
}: MobileBuyBarProps) {
  const { addItem } = useCart();
  const { show } = useToast();
  const inStock = stock > 0 && variantId !== null;

  const handleAdd = () => {
    if (!inStock || !variantId) return;
    addItem({
      variantId,
      slug,
      title,
      thumbnailUrl,
      variantLabel: null,
      unitPricePoisha: pricePoisha,
      qty: 1,
      stockAvailable: stock,
      sellerName: sellerName ?? null,
    });
    track('ADD_TO_CART', { productId, variantId, qty: 1, unitPricePoisha: pricePoisha });
    show({ kind: 'success', title: labels.addedToCart, description: title, thumbnailUrl });
  };

  return (
    <div className={styles.bar} role="region" aria-label="Buy actions">
      <div className={styles.price}>
        <span className={`${styles.priceValue} sk-tabular`}>{formatPoisha(pricePoisha)}</span>
      </div>
      <button
        type="button"
        className={styles.cta}
        onClick={handleAdd}
        disabled={!inStock}
      >
        {inStock ? labels.addToCart : labels.outOfStock}
      </button>
    </div>
  );
}