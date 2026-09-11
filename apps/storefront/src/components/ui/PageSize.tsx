import type { CSSProperties } from 'react';
import styles from './PageSize.module.css';

export interface PageSizeProps {
  value: number;
  options: number[];
  onChange: (value: number) => void;
  label: string;
  className?: string;
  style?: CSSProperties;
}

export function PageSize({ value, options, onChange, label, className, style }: PageSizeProps) {
  const cls = [styles.wrap, className].filter(Boolean).join(' ');
  const id = 'page-size-select';
  return (
    <div className={cls} style={style}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))} className={styles.select}>
        {options.map((n) => (<option key={n} value={n}>{n}</option>))}
      </select>
    </div>
  );
}