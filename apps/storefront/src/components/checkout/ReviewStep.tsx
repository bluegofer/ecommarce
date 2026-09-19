'use client';

import { useState } from 'react';
import type { CartItem } from '@/lib/cart/context';
import { formatPoisha } from '@/lib/format/money';
import type { CheckoutAddress } from './AddressStep';
import type { PaymentMethod } from './PaymentStep';
import styles from './ReviewStep.module.css';

export interface ReviewStepProps {
  address: CheckoutAddress;
  paymentMethod: PaymentMethod;
  items: CartItem[];
  subtotalPoisha: number;
  deliveryFeePoisha: number;
  discountPoisha: number;
  couponCode: string | null;
  onSubmit: () => Promise<void>;
  /** Navigate back to a step (1 = Address, 2 = Payment). */
  onEdit: (step: 1 | 2) => void;
  onBack: () => void;
  locale: 'bn' | 'en';
  labels: {
    title: string;
    addressSection: string;
    paymentSection: string;
    itemsSection: string;
    edit: string;
    back: string;
    placeOrder: string;
    placing: string;
    terms: string;
    summaryTitle: string;
    subtotal: string;
    delivery: string;
    discount: string;
    total: string;
    paymentNames: Record<PaymentMethod, string>;
  };
}

export function ReviewStep({
  address,
  paymentMethod,
  items,
  subtotalPoisha,
  deliveryFeePoisha,
  discountPoisha,
  couponCode,
  onSubmit,
  onEdit,
  onBack,
  locale,
  labels,
}: ReviewStepProps) {
  const [submitting, setSubmitting] = useState(false);
  const total = Math.max(0, subtotalPoisha + deliveryFeePoisha - discountPoisha);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.layout}>
      <div className={styles.mainCol}>
        <h2 className={styles.sectionTitle}>{labels.title}</h2>

        {/* Address review */}
        <section className={styles.block}>
          <header className={styles.blockHead}>
            <h3 className={styles.blockTitle}>{labels.addressSection}</h3>
            <button type="button" className={styles.editBtn} onClick={() => onEdit(1)}>
              {labels.edit}
            </button>
          </header>
          <div className={styles.blockBody}>
            <div className={styles.addrLine}>
              <strong>{address.recipientName}</strong>
            </div>
            <div className={styles.addrLine}>{address.phone}</div>
            {address.contactEmail ? <div className={styles.addrLine}>{address.contactEmail}</div> : null}
            <div className={styles.addrLine}>
              {address.line1}, {address.area}, {address.city}
              {address.postcode ? ` – ${address.postcode}` : ''}
            </div>
          </div>
        </section>

        {/* Payment review */}
        <section className={styles.block}>
          <header className={styles.blockHead}>
            <h3 className={styles.blockTitle}>{labels.paymentSection}</h3>
            <button type="button" className={styles.editBtn} onClick={() => onEdit(2)}>
              {labels.edit}
            </button>
          </header>
          <div className={styles.blockBody}>
            <div className={styles.addrLine}>{labels.paymentNames[paymentMethod]}</div>
            {paymentMethod === 'cod' ? (
              <div className={styles.codNote}>
                {locale === 'bn'
                  ? `ডেলিভারির সময় ${formatPoisha(total)} নগদ পরিশোধ করুন`
                  : `Pay ${formatPoisha(total)} in cash on delivery`}
              </div>
            ) : null}
          </div>
        </section>

        {/* Items review */}
        <section className={styles.block}>
          <header className={styles.blockHead}>
            <h3 className={styles.blockTitle}>{labels.itemsSection}</h3>
          </header>
          <ul className={styles.itemsList}>
            {items.map((it) => (
              <li key={it.variantId} className={styles.itemRow}>
                {it.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.itemThumb} src={it.thumbnailUrl} alt="" width={56} height={56} />
                ) : (
                  <span className={styles.itemThumbEmpty} aria-hidden="true" />
                )}
                <div className={styles.itemInfo}>
                  <div className={styles.itemTitle}>{it.title}</div>
                  <div className={styles.itemSub}>
                    <span className="sk-tabular">× {it.qty}</span>
                    <span className={`${styles.itemPrice} sk-tabular`}>
                      {formatPoisha(it.unitPricePoisha * it.qty)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className={styles.navRow}>
          <button type="button" className={styles.backBtn} onClick={onBack}>{labels.back}</button>
          <button
            type="button"
            className={styles.placeBtn}
            onClick={handleSubmit}
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? labels.placing : labels.placeOrder}
          </button>
        </div>

        <p className={styles.terms}>{labels.terms}</p>
      </div>

      <aside className={styles.summaryCol}>
        <div className={styles.summaryCard}>
          <h3 className={styles.summaryTitle}>{labels.summaryTitle}</h3>
          <div className={styles.summaryRows}>
            <div className={styles.summaryRow}>
              <span>{labels.subtotal}</span>
              <span className="sk-tabular">{formatPoisha(subtotalPoisha)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>{labels.delivery}</span>
              <span className="sk-tabular">
                {deliveryFeePoisha === 0 ? (locale === 'bn' ? 'ফ্রি' : 'FREE') : formatPoisha(deliveryFeePoisha)}
              </span>
            </div>
            {discountPoisha > 0 ? (
              <div className={`${styles.summaryRow} ${styles.discount}`}>
                <span>{labels.discount}{couponCode ? ` (${couponCode})` : ''}</span>
                <span className="sk-tabular">−{formatPoisha(discountPoisha)}</span>
              </div>
            ) : null}
            <div className={styles.totalRow}>
              <span>{labels.total}</span>
              <span className="sk-tabular">{formatPoisha(total)}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}