'use client';

import type { FilterState } from './FilterRail';
import styles from './ActiveFilterChips.module.css';

export interface ActiveFilterChipsProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  labelFor: {
    brand: (v: string) => string;
    price: (min?: number, max?: number) => string;
    rating: (n: number) => string;
    freeDelivery: string;
    discount: (n: number) => string;
    clearAll: string;
  };
}

export function ActiveFilterChips({ value, onChange, labelFor }: ActiveFilterChipsProps) {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  value.brand.forEach((b) => {
    chips.push({
      key: `brand-${b}`,
      label: labelFor.brand(b),
      onRemove: () => onChange({ ...value, brand: value.brand.filter((x) => x !== b) }),
    });
  });

  if (value.minPrice !== undefined || value.maxPrice !== undefined) {
    chips.push({
      key: 'price',
      label: labelFor.price(value.minPrice, value.maxPrice),
      onRemove: () => onChange({ ...value, minPrice: undefined, maxPrice: undefined }),
    });
  }

  if (value.minRating !== undefined) {
    chips.push({
      key: 'rating',
      label: labelFor.rating(value.minRating),
      onRemove: () => onChange({ ...value, minRating: undefined }),
    });
  }

  if (value.freeDelivery) {
    chips.push({
      key: 'freeDelivery',
      label: labelFor.freeDelivery,
      onRemove: () => onChange({ ...value, freeDelivery: undefined }),
    });
  }

  if (value.discount !== undefined) {
    chips.push({
      key: 'discount',
      label: labelFor.discount(value.discount),
      onRemove: () => onChange({ ...value, discount: undefined }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className={styles.row} aria-label="Active filters">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          className={styles.chip}
          onClick={c.onRemove}
          aria-label={`Remove filter: ${c.label}`}
        >
          <span>{c.label}</span>
          <span className={styles.x} aria-hidden="true">×</span>
        </button>
      ))}
      <button
        type="button"
        className={styles.clearAll}
        onClick={() =>
          onChange({ brand: [], minPrice: undefined, maxPrice: undefined, minRating: undefined, freeDelivery: undefined, discount: undefined })
        }
      >
        {labelFor.clearAll}
      </button>
    </div>
  );
}