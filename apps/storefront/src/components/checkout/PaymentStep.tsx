'use client';

import type { CartItem } from '@/lib/cart/context';
import { formatPoisha } from '@/lib/format/money';
import styles from './PaymentStep.module.css';

export type PaymentMethod = 'bkash' | 'nagad' | 'sslcommerz' | 'cod';

export interface PaymentStepProps {
  value: PaymentMethod;
  onChange: (next: PaymentMethod) => void;
  onContinue: () => void;
  onBack: () => void;
  items: CartItem[];
  subtotalPoisha: number;
  deliveryFeePoisha: number;
  discountPoisha: number;
  locale: 'bn' | 'en';
  labels: {
    title: string;
    bkashLabel: string;
    bkashDesc: string;
    nagadLabel: string;
    nagadDesc: string;
    sslcommerzLabel: string;
    sslcommerzDesc: string;
    codLabel: string;
    codDesc: string;
    codFeeNote: string; // "Pay ৳{total} in cash on delivery"
    continue: string;
    back: string;
    summaryTitle: string;
    subtotal: string;
    delivery: string;
    discount: string;
    total: string;
  };
}

const METHODS: { value: PaymentMethod; logo: 'bkash' | 'nagad' | 'card' | 'cod' }[] = [
  { value: 'bkash', logo: 'bkash' },
  { value: 'nagad', logo: 'nagad' },
  { value: 'sslcommerz', logo: 'card' },
  { value: 'cod', logo: 'cod' },
];

export function PaymentStep({
  value,
  onChange,
  onContinue,
  onBack,
  items,
  subtotalPoisha,
  deliveryFeePoisha,
  discountPoisha,
  locale,
  labels,
}: PaymentStepProps) {
  const total = Math.max(0, subtotalPoisha + deliveryFeePoisha - discountPoisha);

  const methodLabels: Record<PaymentMethod, { label: string; desc: string }> = {
    bkash: { label: labels.bkashLabel, desc: labels.bkashDesc },
    nagad: { label: labels.nagadLabel, desc: labels.nagadDesc },
    sslcommerz: { label: labels.sslcommerzLabel, desc: labels.sslcommerzDesc },
    cod: { label: labels.codLabel, desc: labels.codDesc },
  };

  return (
    <div className={styles.layout}>
      <div className={styles.formCol}>
        <h2 className={styles.sectionTitle}>{labels.title}</h2>

        <div className={styles.methods} role="radiogroup" aria-label={labels.title}>
          {METHODS.map((m) => {
            const selected = value === m.value;
            return (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={selected}
                className={[styles.method, selected ? styles.methodSelected : ''].filter(Boolean).join(' ')}
                onClick={() => onChange(m.value)}
              >
                <span className={styles.methodLogo} aria-hidden="true">
                  <MethodLogo kind={m.logo} />
                </span>
                <span className={styles.methodBody}>
                  <span className={styles.methodLabel}>{methodLabels[m.value].label}</span>
                  <span className={styles.methodDesc}>{methodLabels[m.value].desc}</span>
                </span>
                <span className={[styles.radio, selected ? styles.radioOn : ''].filter(Boolean).join(' ')} aria-hidden="true" />
              </button>
            );
          })}
        </div>

        {value === 'cod' ? (
          <div className={styles.codNote}>{labels.codFeeNote.replace('{total}', formatPoisha(total))}</div>
        ) : null}

        <div className={styles.navRow}>
          <button type="button" className={styles.backBtn} onClick={onBack}>{labels.back}</button>
          <button type="button" className={styles.continueBtn} onClick={onContinue}>{labels.continue}</button>
        </div>
      </div>

      <aside className={styles.summaryCol}>
        <div className={styles.summaryCard}>
          <h3 className={styles.summaryTitle}>{labels.summaryTitle}</h3>
          <ul className={styles.itemList}>
            {items.slice(0, 3).map((it) => (
              <li key={it.variantId} className={styles.itemRow}>
                {it.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.itemThumb} src={it.thumbnailUrl} alt="" width={48} height={48} />
                ) : (
                  <span className={styles.itemThumbEmpty} aria-hidden="true" />
                )}
                <span className={styles.itemTitle}>
                  <span className="sk-tabular">×{it.qty}</span> {it.title}
                </span>
              </li>
            ))}
          </ul>
          {items.length > 3 ? <div className={styles.moreItems}>+{items.length - 3} more</div> : null}

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
                <span>{labels.discount}</span>
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

function MethodLogo({ kind }: { kind: 'bkash' | 'nagad' | 'card' | 'cod' }) {
  const text: Record<typeof kind, string> = { bkash: 'bKash', nagad: 'Nagad', card: 'CARD', cod: 'COD' };
  const bg: Record<typeof kind, string> = { bkash: '#E2136E', nagad: '#EE7623', card: '#25729A', cod: '#16A34A' };
  return (
    <span className={styles.logoPill} style={{ background: bg[kind] }}>
      {text[kind]}
    </span>
  );
}