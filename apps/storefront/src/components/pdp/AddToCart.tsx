'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart/context';
import { useWishlist } from '@/lib/wishlist/context';
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
    wishlistAdd: string;
    wishlistRemove: string;
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
  const wishlist = useWishlist();
  const wishlisted = wishlist.has(productId);

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

      {/* Wishlist heart (T1-6) */}
      <button
        type="button"
        className={styles.heartBtn}
        aria-pressed={wishlisted}
        aria-label={wishlisted ? labels.wishlistRemove : labels.wishlistAdd}
        onClick={() =>
          void wishlist.toggle({
            productId,
            slug,
            titleEn: title,
            titleBn: title,
            imageUrl: thumbnailUrl,
            minPricePoisha: pricePoisha,
            addedAt: new Date().toISOString(),
          })
        }
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill={wishlisted ? 'var(--sk-heart)' : 'none'} aria-hidden="true">
          <path
            d="M12 21s-7-4.35-9.5-9.1A5.5 5.5 0 0 1 12 5.5a5.5 5.5 0 0 1 9.5 6.4C19 16.65 12 21 12 21z"
            stroke="var(--sk-heart)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      </div>
    </div>
  );
}