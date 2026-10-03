'use client';

import type { CSSProperties } from 'react';
import styles from './Sort.module.css';

export type SortValue = 'featured' | 'price_asc' | 'price_desc' | 'newest' | 'rating' | 'best_sellers';
export interface SortOption { value: SortValue; label: string; }
export interface SortProps {
  value: SortValue;
  options: SortOption[];
  /** Optional — when omitted, changes are no-ops (useful for SSR demos). */
  onChange?: (value: SortValue) => void;
  label: string;
  className?: string;
  style?: CSSProperties;
}

export function Sort({ value, options, onChange, label, className, style }: SortProps) {
  const cls = [styles.wrap, className].filter(Boolean).join(' ');
  const id = 'sort-select';
  const handle = onChange ?? (() => {});
  return (
    <div className={cls} style={style}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <select id={id} value={value} onChange={(e) => handle(e.target.value as SortValue)} className={styles.select}>
        {options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </div>
  );
}