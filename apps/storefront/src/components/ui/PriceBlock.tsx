import type { CSSProperties } from 'react';
import { formatPoisha, savingsPercent } from '@/lib/format/money';
import styles from './PriceBlock.module.css';

export interface PriceBlockProps {
  /** Current price in poisha (integer). */
  pricePoisha: number;
  /** Optional list/MRP price for strikethrough. */
  listPricePoisha?: number;
  /** Size variant — 'card' (18px) or 'pdp' (28px per UI Spec B10). */
  size?: 'card' | 'pdp';
  /** Locale for aria labels; affects nothing visually but helps a11y. */
  locale?: 'bn' | 'en';
  className?: string;
  style?: CSSProperties;
}

export function PriceBlock({
  pricePoisha,
  listPricePoisha,
  size = 'card',
  locale = 'en',
  className,
  style,
}: PriceBlockProps) {
  const hasList = listPricePoisha !== undefined && listPricePoisha > pricePoisha;
  const percent = hasList ? savingsPercent(pricePoisha, listPricePoisha!) : 0;
  const savings = hasList ? listPricePoisha! - pricePoisha : 0;

  const cls = [styles.wrap, styles[size], className].filter(Boolean).join(' ');

  const aria = locale === 'bn' ? 'মূল্য' : 'Price';

  return (
    <div className={cls} style={style} aria-label={aria}>
      <span className={`${styles.current} sk-tabular`}>{formatPoisha(pricePoisha)}</span>
      {hasList && (
        <span className={`${styles.list} sk-tabular`}>{formatPoisha(listPricePoisha!)}</span>
      )}
      {hasList && (
        <span className={styles.savings}>
          Save {formatPoisha(savings)} ({percent}%)
        </span>
      )}
    </div>
  );
}