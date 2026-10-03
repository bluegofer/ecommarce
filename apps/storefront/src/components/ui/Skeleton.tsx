import type { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: 'sm' | 'md' | 'lg' | 'pill';
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ width, height, radius = 'sm', className, style }: SkeletonProps) {
  const cls = [styles.block, styles[`r_${radius}`], className].filter(Boolean).join(' ');
  return (
    <div
      className={cls}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}

/** 1:1 image + 2 lines + price line — matches B8 product card shape. */
export function SkeletonCard() {
  return (
    <div className={styles.card}>
      <Skeleton width="100%" height={0} style={{ aspectRatio: '1 / 1' }} radius="md" />
      <Skeleton width="80%" height={14} />
      <Skeleton width="60%" height={14} />
      <Skeleton width="40%" height={18} />
    </div>
  );
}

/** 72px thumb + 3 lines — matches B8 list row shape. */
export function SkeletonRow() {
  return (
    <div className={styles.row}>
      <Skeleton width={72} height={72} radius="md" />
      <div className={styles.rowLines}>
        <Skeleton width="90%" height={14} />
        <Skeleton width="70%" height={14} />
        <Skeleton width="50%" height={12} />
      </div>
    </div>
  );
}