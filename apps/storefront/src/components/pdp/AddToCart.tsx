'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart/context';
import { useToast } from '@/lib/ui/toast-context';
import { track } from '@/lib/analytics/events';
import { QtyStepper } from './QtyStepper';
import styles from './AddToCart.module.css';

export interface AddToCartProps {
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
    buyNow: string;
    notifyMe: string;
    qty: string;
    outOfStock: string;
    inStock: string;
    addedToCart: string;
    lowStock: string; // with {n}
  };
}

export function AddToCart({
  productId,
  variantId,
  slug,
  title,
  thumbnailUrl,
  pricePoisha,
  stock,
  sellerName,
  locale,
  labels,
}: AddToCartProps) {
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const { addItem } = useCart();
  const { show } = useToast();

  const inStock = stock > 0 && variantId !== null;

  const handleAdd = () => {
    if (!inStock || !variantId) return;
    setSubmitting(true);
    addItem({
      variantId,
      slug,
      title,
      thumbnailUrl,
      variantLabel: null,
      unitPricePoisha: pricePoisha,
      qty,
      stockAvailable: stock,
      sellerName: sellerName ?? null,
    });
    track('ADD_TO_CART', { productId, variantId, qty, unitPricePoisha: pricePoisha });
    show({
      kind: 'success',
      title: labels.addedToCart,
      description: title,
      thumbnailUrl,
    });
    setSubmitting(false);
  };

  const handleBuyNow = () => {
    if (!inStock) return;
    handleAdd();
    // Step 8.6 will navigate to /checkout. For now, direct to cart page.
    window.location.href = `/${locale}/cart`;
  };

  return (
    <div className={styles.wrap}>
      {/* Stock chip */}
      <div className={styles.stockRow}>
        {inStock ? (
          <span className={styles.stockIn}>
            {locale === 'bn' ? '✓ স্টকে আছে' : '✓ In Stock'}
          </span>
        ) : (
          <span className={styles.stockOut}>{labels.outOfStock}</span>
        )}
        {inStock && stock <= 5 ? (
          <span className={styles.lowStock}>{labels.lowStock.replace('{n}', String(stock))}</span>
        ) : null}
      </div>

      {/* Qty */}
      {inStock ? (
        <div className={styles.qtyRow}>
          <span className={styles.qtyLabel}>{labels.qty}</span>
          <QtyStepper value={qty} max={stock} onChange={setQty} label={labels.qty} />
        </div>
      ) : null}

      {/* Buttons */}
      <div className={styles.actions}>
        {inStock ? (
          <>
            <button
              type="button"
              className={styles.addBtn}
              onClick={handleAdd}
              disabled={submitting}
            >
              {labels.addToCart}
            </button>
            <button
              type="button"
              className={styles.buyBtn}
              onClick={handleBuyNow}
              disabled={submitting}
            >
              {labels.buyNow}
            </button>
          </>
        ) : (
          <button type="button" className={styles.notifyBtn}>
            {labels.notifyMe}
          </button>
        )}
      </div>
    </div>
  );
}