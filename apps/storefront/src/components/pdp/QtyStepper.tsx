'use client';

import styles from './QtyStepper.module.css';

export interface QtyStepperProps {
  value: number;
  max: number;
  min?: number;
  onChange: (next: number) => void;
  /** For aria — the parent input label. */
  label?: string;
}

export function QtyStepper({ value, max, min = 1, onChange, label }: QtyStepperProps) {
  const decrement = () => onChange(Math.max(min, value - 1));
  const increment = () => onChange(Math.min(max, value + 1));

  return (
    <div className={styles.wrap} role="group" aria-label={label ?? 'Quantity'}>
      <button
        type="button"
        className={styles.btn}
        onClick={decrement}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className={`${styles.value} sk-tabular`} aria-live="polite">{value}</span>
      <button
        type="button"
        className={styles.btn}
        onClick={increment}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}