import { formatPoisha } from '@/lib/format/money';
import styles from './FreeShippingBar.module.css';

export interface FreeShippingBarProps {
  /** Current subtotal in poisha. */
  subtotalPoisha: number;
  /** Threshold in poisha (UI Spec: ৳1,500 = 150000). */
  thresholdPoisha: number;
  locale: 'bn' | 'en';
}

export function FreeShippingBar({ subtotalPoisha, thresholdPoisha, locale }: FreeShippingBarProps) {
  const pct = Math.min(100, (subtotalPoisha / thresholdPoisha) * 100);
  const unlocked = subtotalPoisha >= thresholdPoisha;
  const remaining = Math.max(0, thresholdPoisha - subtotalPoisha);

  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <div className={styles.text}>
        {unlocked
          ? (locale === 'bn' ? '🎉 আপনি ফ্রি ডেলিভারি পেয়েছেন!' : '🎉 You unlocked FREE delivery!')
          : (locale === 'bn'
              ? `${formatPoisha(remaining)} আরো কিনলে ফ্রি ডেলিভারি`
              : `Add ${formatPoisha(remaining)} more for FREE delivery`)}
      </div>
      <div className={styles.bar} aria-hidden="true">
        <div
          className={[styles.fill, unlocked ? styles.fillDone : ''].filter(Boolean).join(' ')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}