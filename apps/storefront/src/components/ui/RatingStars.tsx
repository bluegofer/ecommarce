import { useId, type CSSProperties } from 'react';
import styles from './RatingStars.module.css';

export interface RatingStarsProps {
  /** Average rating 0..5, one decimal typical. */
  average: number;
  /** Total number of ratings. */
  count?: number;
  /** Size in px — UI Spec B9: 16 (card) or 20 (PDP). */
  size?: 16 | 20;
  /** When provided, the count is rendered as a link to this anchor (e.g. "#reviews"). */
  countHref?: string;
  /** Locale for the "no ratings" label. */
  locale?: 'bn' | 'en';
  className?: string;
  style?: CSSProperties;
}

export function RatingStars({
  average,
  count,
  size = 16,
  countHref,
  locale = 'en',
  className,
  style,
}: RatingStarsProps) {
  const safe = Math.max(0, Math.min(5, average));
  const cls = [styles.wrap, className].filter(Boolean).join(' ');
  const uid = useId();

  if (!count) {
    return (
      <span className={cls} style={style}>
        <span className={styles.empty}>
          {locale === 'bn' ? 'এখনো রেটিং নেই' : 'No ratings yet'}
        </span>
      </span>
    );
  }

  const countLabel = count.toLocaleString('en-US');
  const ariaLabel =
    locale === 'bn'
      ? `${safe} এর মধ্যে ৫, ${countLabel}টি রেটিং`
      : `${safe} out of 5, ${countLabel} ratings`;

  return (
    <span className={cls} style={style} aria-label={ariaLabel}>
      <StarRow value={safe} size={size} uid={uid} />
      <span className={styles.avg}>{safe.toFixed(1)}</span>
      {countHref ? (
        <a href={countHref} className={styles.count}>
          ({countLabel})
        </a>
      ) : (
        <span className={styles.count}>({countLabel})</span>
      )}
    </span>
  );
}

function StarRow({ value, size, uid }: { value: number; size: number; uid: string }) {
  const stars = [0, 1, 2, 3, 4];
  return (
    <span className={styles.stars} style={{ height: size, width: size * 5 }} aria-hidden="true">
      {stars.map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return <Star key={i} fillRatio={fill} size={size} clipId={`${uid}-s${i}`} />;
      })}
    </span>
  );
}

function Star({
  fillRatio,
  size,
  clipId,
}: {
  fillRatio: number;
  size: number;
  clipId: string;
}) {
  const pathD =
    'M12 2.5l3.09 6.26 6.91 1.005-5 4.87 1.18 6.88L12 18.27l-6.18 3.25L7 14.64l-5-4.87 6.91-1.005L12 2.5z';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline-block' }}>
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={24 * fillRatio} height="24" />
        </clipPath>
      </defs>
      <path d={pathD} fill="var(--sk-border)" />
      <path d={pathD} fill="var(--sk-star)" clipPath={`url(#${clipId})`} />
    </svg>
  );
}