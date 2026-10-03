'use client';

import { useCallback, useMemo, useState } from 'react';
import { useCart } from '@/lib/cart/context';
import { useSaved } from '@/lib/cart/saved-context';
import { useToast } from '@/lib/ui/toast-context';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';
import { SaveForLater } from './SaveForLater';
import { CartEmpty } from './CartEmpty';
import styles from './CartClient.module.css';

const FREE_SHIPPING_THRESHOLD = 150000; // ৳1,500
const SAVE200_DISCOUNT = 20000; // ৳200

export interface CartClientProps {
  locale: 'bn' | 'en';
  labels: {
    title: string; // "Shopping Cart"
    selectedCount: string; // "{n} items selected"
    subtotal: string; // "Subtotal ({n} items)"
    delivery: string;
    freeLabel: string;
    discount: string;
    total: string;
    couponPlaceholder: string;
    couponApply: string;
    couponRemove: string;
    couponSuccess: string;
    couponError: string;
    proceed: string;
    secure: string;
    emiNote: string;
    // CartItem labels
    remove: string;
    removedUndo: string;
    undo: string;
    saveLater: string;
    movedToSaved: string;
    inStock: string;
    lowStock: string;
    outOfStock: string;
    qty: string;
    // SaveForLater
    savedHeader: string;
    moveToCart: string;
    // Empty
    emptyTitle: string;
    emptyBody: string;
    emptyCta: string;
  };
}

export function CartClient({ locale, labels }: CartClientProps) {
  const cart = useCart();
  const saved = useSaved();
  const { show: showToast } = useToast();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [couponCode, setCouponCode] = useState<string | null>(null);

  // Hydration-aware: mark all items selected once hydrated
  // (default: all items selected, per UI Spec C4)
  const hydrated = cart.hydrated && saved.hydrated;

  const effectiveSelected = useMemo(() => {
    if (selectedIds.size === 0 && cart.items.length > 0) {
      // First render after hydration: everything checked
      return new Set(cart.items.map((i) => i.variantId));
    }
    return selectedIds;
  }, [selectedIds, cart.items]);

  const handleToggleSelect = useCallback((variantId: string) => {
    setSelectedIds((prev) => {
      const base = prev.size === 0 && cart.items.length > 0
        ? new Set(cart.items.map((i) => i.variantId))
        : new Set(prev);
      if (base.has(variantId)) base.delete(variantId);
      else base.add(variantId);
      return base;
    });
  }, [cart.items]);

  const handleQtyChange = useCallback((variantId: string, qty: number) => {
    cart.updateQty(variantId, qty);
  }, [cart]);

  const handleRemove = useCallback((variantId: string) => {
    const removed = cart.items.find((i) => i.variantId === variantId);
    if (!removed) return;
    cart.removeItem(variantId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(variantId);
      return next;
    });
    showToast({
      kind: 'info',
      title: labels.removedUndo,
      description: removed.title,
      action: {
        label: labels.undo,
        onClick: () => cart.addItem(removed),
      },
      durationMs: 5000,
    });
  }, [cart, labels, showToast]);

  const handleSaveForLater = useCallback((variantId: string) => {
    const item = cart.items.find((i) => i.variantId === variantId);
    if (!item) return;
    saved.save(item);
    cart.removeItem(variantId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(variantId);
      return next;
    });
    showToast({
      kind: 'success',
      title: labels.movedToSaved,
      description: item.title,
      thumbnailUrl: item.thumbnailUrl,
    });
  }, [cart, saved, labels, showToast]);

  const handleMoveToCart = useCallback((variantId: string) => {
    const item = saved.items.find((i) => i.variantId === variantId);
    if (!item) return;
    cart.addItem(item);
    saved.remove(variantId);
  }, [cart, saved]);

  const handleRemoveSaved = useCallback((variantId: string) => {
    saved.remove(variantId);
  }, [saved]);

  const handleApplyCoupon = useCallback((code: string) => {
    setCouponCode(code);
  }, []);

  const handleClearCoupon = useCallback(() => {
    setCouponCode(null);
  }, []);

  // Derived totals
  const selectedItems = cart.items.filter((i) => effectiveSelected.has(i.variantId));
  const subtotalPoisha = selectedItems.reduce((sum, i) => sum + i.unitPricePoisha * i.qty, 0);
  const selectedCount = selectedItems.reduce((sum, i) => sum + i.qty, 0);
  const couponDiscountPoisha = couponCode === 'SAVE200' ? SAVE200_DISCOUNT : 0;
  const canCheckout = selectedCount > 0;

  if (!hydrated) {
    return <div className={styles.placeholder} aria-busy="true" />;
  }

  if (cart.items.length === 0 && saved.items.length === 0) {
    return (
      <CartEmpty
        locale={locale}
        labels={{
          title: labels.emptyTitle,
          body: labels.emptyBody,
          cta: labels.emptyCta,
        }}
      />
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.list}>
        <header className={styles.header}>
          <h1 className={styles.title}>{labels.title}</h1>
          <span className={styles.count}>
            {labels.selectedCount.replace('{n}', String(selectedCount))}
          </span>
        </header>

        {cart.items.length > 0 ? (
          <ul className={styles.items}>
            {cart.items.map((item) => (
              <li key={item.variantId}>
                <CartItem
                  item={item}
                  selected={effectiveSelected.has(item.variantId)}
                  onToggleSelect={handleToggleSelect}
                  onQtyChange={handleQtyChange}
                  onRemove={handleRemove}
                  onSaveForLater={handleSaveForLater}
                  locale={locale}
                  labels={{
                    remove: labels.remove,
                    saveLater: labels.saveLater,
                    inStock: labels.inStock,
                    lowStock: labels.lowStock,
                    outOfStock: labels.outOfStock,
                    qty: labels.qty,
                  }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.noActive}>{labels.emptyTitle}</p>
        )}

        <SaveForLater
          items={saved.items}
          onMoveToCart={handleMoveToCart}
          onRemove={handleRemoveSaved}
          locale={locale}
          labels={{
            header: labels.savedHeader,
            moveToCart: labels.moveToCart,
            remove: labels.remove,
          }}
        />
      </div>

      <div className={styles.summaryWrap}>
        <CartSummary
          subtotalPoisha={subtotalPoisha}
          selectedCount={selectedCount}
          couponCode={couponCode}
          couponDiscountPoisha={couponDiscountPoisha}
          freeShippingThresholdPoisha={FREE_SHIPPING_THRESHOLD}
          canCheckout={canCheckout}
          onApplyCoupon={handleApplyCoupon}
          onClearCoupon={handleClearCoupon}
          locale={locale}
          labels={{
            subtotal: labels.subtotal,
            delivery: labels.delivery,
            freeLabel: labels.freeLabel,
            discount: labels.discount,
            total: labels.total,
            couponPlaceholder: labels.couponPlaceholder,
            apply: labels.couponApply,
            remove: labels.couponRemove,
            proceed: labels.proceed,
            secure: labels.secure,
            emiNote: labels.emiNote,
            couponSuccess: labels.couponSuccess,
            couponError: labels.couponError,
          }}
        />
      </div>
    </div>
  );
}