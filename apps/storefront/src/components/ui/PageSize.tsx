'use client';

import type { CSSProperties } from 'react';
import styles from './PageSize.module.css';

export interface PageSizeProps {
  value: number;
  options: number[];
  /** Optional — when omitted, changes are no-ops (useful for SSR demos). */
  onChange?: (value: number) => void;
  label: string;
  className?: string;
  style?: CSSProperties;
}

export function PageSize({ value, options, onChange, label, className, style }: PageSizeProps) {
  const cls = [styles.wrap, className].filter(Boolean).join(' ');
  const id = 'page-size-select';
  const handle = onChange ?? (() => {});
  return (
    <div className={cls} style={style}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <select id={id} value={value} onChange={(e) => handle(Number(e.target.value))} className={styles.select}>
        {options.map((n) => (<option key={n} value={n}>{n}</option>))}
      </select>
    </div>
  );
}