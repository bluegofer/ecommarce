import type { CSSProperties, ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeKind =
  | 'discount'
  | 'best-seller'
  | 'new'
  | 'low-stock'
  | 'out-of-stock'
  | 'free-delivery'
  | 'deal-timer'
  | 'in-stock';

export interface BadgeProps {
  kind: BadgeKind;
  /** Only for `discount` — e.g. 45 renders "-45%". */
  percent?: number;
  /** Label text; when absent a sensible EN default is used by callers. */
  children?: ReactNode;
  /** Only for `deal-timer` — pre-formatted "hh:mm:ss". */
  timer?: string;
  className?: string;
  style?: CSSProperties;
}

export function Badge({ kind, percent, children, timer, className, style }: BadgeProps) {
  const cls = [styles.badge, styles[kind.replace('-', '_') as keyof typeof styles], className]
    .filter(Boolean)
    .join(' ');

  let content: ReactNode = children;
  if (kind === 'discount' && percent !== undefined) content = `-${percent}%`;
  if (kind === 'deal-timer' && timer) {
    content = (
      <span className={styles.timerInner}>
        <ClockIcon />
        <span className="sk-tabular">{timer}</span>
      </span>
    );
  }

  return (
    <span className={cls} style={style} role="status">
      {content}
    </span>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}