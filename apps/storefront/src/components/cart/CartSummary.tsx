'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatPoisha } from '@/lib/format/money';
import { FreeShippingBar } from './FreeShippingBar';
import styles from './CartSummary.module.css';

export interface CartSummaryProps {
  subtotalPoisha: number;
  selectedCount: number;
  /** Applied coupon (null = none yet). */
  couponCode: string | null;
  couponDiscountPoisha: number;
  freeShippingThresholdPoisha: number;
  /** Whether checkout is enabled (at least 1 item selected). */
  canCheckout: boolean;
  /** Coupon apply handler — placeholder in Step 8.5, real eval in 8.6. */
  onApplyCoupon: (code: string) => void;
  /** Coupon clear handler. */
  onClearCoupon: () => void;
  locale: 'bn' | 'en';
  labels: {
    subtotal: string; // "Subtotal ({n} items)"
    delivery: string;
    freeLabel: string;
    discount: string;
    total: string;
    couponPlaceholder: string;
    apply: string;
    remove: string;
    proceed: string;
    secure: string;
    emiNote: string;
    couponSuccess: string;
    couponError: string;
  };
}

export function CartSummary({
  subtotalPoisha,
  selectedCount,
  couponCode,
  couponDiscountPoisha,
  freeShippingThresholdPoisha,
  canCheckout,
  onApplyCoupon,
  onClearCoupon,
  locale,
  labels,
}: CartSummaryProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const deliveryFree = subtotalPoisha >= freeShippingThresholdPoisha;
  const deliveryFeePoisha = subtotalPoisha === 0 ? 0 : deliveryFree ? 0 : 6000; // ৳60 standard
  const totalPoisha = Math.max(0, subtotalPoisha + deliveryFeePoisha - couponDiscountPoisha);

  const handleApply = () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setError(null);
    // Step 8.6 will call the server eval; for now, only "SAVE200" works locally
    if (trimmed.toUpperCase() === 'SAVE200') {
      onApplyCoupon('SAVE200');
      setCode('');
    } else {
      setError(labels.couponError);
    }
  };

  return (
    <aside className={styles.card} aria-label="Order summary">
      <h2 className={styles.title}>{locale === 'bn' ? 'অর্ডার সারাংশ' : 'Order Summary'}</h2>

      <div className={styles.row}>
        <span>{labels.subtotal.replace('{n}', String(selectedCount))}</span>
        <span className={`${styles.value} sk-tabular`}>{formatPoisha(subtotalPoisha)}</span>
      </div>

      <div className={styles.row}>
        <span>{labels.delivery}</span>
        <span className={`${styles.value} ${deliveryFree ? styles.free : ''} sk-tabular`}>
          {deliveryFree ? labels.freeLabel : formatPoisha(deliveryFeePoisha)}
        </span>
      </div>

      {couponCode ? (
        <div className={`${styles.row} ${styles.discountRow}`}>
          <span>
            {labels.discount} ({couponCode})
            <button type="button" className={styles.removeCoupon} onClick={onClearCoupon} aria-label={labels.remove}>
              ×
            </button>
          </span>
          <span className={`${styles.value} sk-tabular`}>−{formatPoisha(couponDiscountPoisha)}</span>
        </div>
      ) : null}

      <div className={styles.totalRow}>
        <span>{labels.total}</span>
        <span className={`${styles.totalValue} sk-tabular`}>{formatPoisha(totalPoisha)}</span>
      </div>

      <FreeShippingBar
        subtotalPoisha={subtotalPoisha}
        thresholdPoisha={freeShippingThresholdPoisha}
        locale={locale}
      />

      {/* Coupon input */}
      <div className={styles.couponWrap}>
        <div className={styles.couponRow}>
          <input
            type="text"
            className={styles.couponInput}
            placeholder={labels.couponPlaceholder}
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(null); }}
            aria-label={labels.couponPlaceholder}
          />
          <button type="button" className={styles.couponBtn} onClick={handleApply}>
            {labels.apply}
          </button>
        </div>
        {error ? <div className={styles.couponError}>{error}</div> : null}
        {couponCode ? <div className={styles.couponSuccess}>{labels.couponSuccess}</div> : null}
      </div>

      <Link
        href={canCheckout ? `/${locale}/checkout` : '#'}
        className={[styles.proceed, !canCheckout ? styles.proceedDisabled : ''].filter(Boolean).join(' ')}
        aria-disabled={!canCheckout}
        onClick={(e) => { if (!canCheckout) e.preventDefault(); }}
      >
        {labels.proceed}
      </Link>

      <div className={styles.secure}>
        <LockIcon /> {labels.secure}
      </div>

      <div className={styles.emi}>{labels.emiNote}</div>
    </aside>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 11V8a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}