'use client';

import { useState } from 'react';
import type { SearchFacets } from '@/lib/api/types';
import styles from './FilterRail.module.css';

export interface FilterState {
  brand: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  freeDelivery?: boolean;
  discount?: number;
}

export interface FilterRailProps {
  facets: SearchFacets;
  value: FilterState;
  onChange: (next: FilterState) => void;
  locale: 'bn' | 'en';
  /** Locale labels from i18n dict. */
  labels: {
    title: string;
    price: string;
    brand: string;
    rating: string;
    delivery: string;
    discount: string;
    apply: string;
    showAll: string;
    showLess: string;
  };
}

export function FilterRail({ facets, value, onChange, locale, labels }: FilterRailProps) {
  return (
    <aside className={styles.rail} aria-label={labels.title}>
      <h2 className={styles.railTitle}>{labels.title}</h2>
      <PriceGroup value={value} onChange={onChange} locale={locale} label={labels.price} />
      <BrandGroup facets={facets} value={value} onChange={onChange} labels={labels} />
      <RatingGroup value={value} onChange={onChange} label={labels.rating} />
      <DeliveryGroup value={value} onChange={onChange} label={labels.delivery} />
      <DiscountGroup value={value} onChange={onChange} label={labels.discount} />
    </aside>
  );
}

function PriceGroup({
  value,
  onChange,
  locale,
  label,
}: {
  value: FilterState;
  onChange: (v: FilterState) => void;
  locale: 'bn' | 'en';
  label: string;
}) {
  const [min, setMin] = useState(value.minPrice ? String(value.minPrice / 100) : '');
  const [max, setMax] = useState(value.maxPrice ? String(value.maxPrice / 100) : '');

  const apply = () => {
    onChange({
      ...value,
      minPrice: min ? Math.round(Number(min) * 100) : undefined,
      maxPrice: max ? Math.round(Number(max) * 100) : undefined,
    });
  };

  return (
    <details className={styles.group} open>
      <summary className={styles.groupTitle}>{label}</summary>
      <div className={styles.priceRow}>
        <input
          type="number"
          inputMode="numeric"
          placeholder="min"
          className={styles.priceInput}
          value={min}
          onChange={(e) => setMin(e.target.value)}
          aria-label={locale === 'bn' ? 'সর্বনিম্ন মূল্য' : 'Minimum price'}
        />
        <span className={styles.dash}>–</span>
        <input
          type="number"
          inputMode="numeric"
          placeholder="max"
          className={styles.priceInput}
          value={max}
          onChange={(e) => setMax(e.target.value)}
          aria-label={locale === 'bn' ? 'সর্বোচ্চ মূল্য' : 'Maximum price'}
        />
        <button type="button" className={styles.go} onClick={apply}>
          {locale === 'bn' ? 'যাও' : 'Go'}
        </button>
      </div>
    </details>
  );
}

function BrandGroup({
  facets,
  value,
  onChange,
  labels,
}: {
  facets: SearchFacets;
  value: FilterState;
  onChange: (v: FilterState) => void;
  labels: FilterRailProps['labels'];
}) {
  const [showAll, setShowAll] = useState(false);
  const brands = facets.brands ?? [];
  const visible = showAll ? brands : brands.slice(0, 5);

  const toggle = (name: string) => {
    const set = new Set(value.brand);
    if (set.has(name)) set.delete(name);
    else set.add(name);
    onChange({ ...value, brand: Array.from(set) });
  };

  if (brands.length === 0) return null;

  return (
    <details className={styles.group} open>
      <summary className={styles.groupTitle}>{labels.brand}</summary>
      <ul className={styles.list}>
        {visible.map((b) => (
          <li key={b.value} className={styles.checkRow}>
            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={value.brand.includes(b.value)}
                onChange={() => toggle(b.value)}
              />
              <span>{b.value}</span>
              <span className={styles.count}>({b.count})</span>
            </label>
          </li>
        ))}
      </ul>
      {brands.length > 5 ? (
        <button
          type="button"
          className={styles.showMore}
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? labels.showLess : labels.showAll}
        </button>
      ) : null}
    </details>
  );
}

function RatingGroup({
  value,
  onChange,
  label,
}: {
  value: FilterState;
  onChange: (v: FilterState) => void;
  label: string;
}) {
  const ratings = [4, 3, 2];
  return (
    <details className={styles.group} open>
      <summary className={styles.groupTitle}>{label}</summary>
      <ul className={styles.list}>
        {ratings.map((r) => (
          <li key={r} className={styles.checkRow}>
            <label className={styles.checkLabel}>
              <input
                type="radio"
                name="rating"
                checked={value.minRating === r}
                onChange={() => onChange({ ...value, minRating: r })}
              />
              <span>★ {r}+</span>
            </label>
          </li>
        ))}
      </ul>
    </details>
  );
}

function DeliveryGroup({
  value,
  onChange,
  label,
}: {
  value: FilterState;
  onChange: (v: FilterState) => void;
  label: string;
}) {
  return (
    <details className={styles.group} open>
      <summary className={styles.groupTitle}>{label}</summary>
      <ul className={styles.list}>
        <li className={styles.checkRow}>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={Boolean(value.freeDelivery)}
              onChange={(e) => onChange({ ...value, freeDelivery: e.target.checked })}
            />
            <span>Free Delivery</span>
          </label>
        </li>
      </ul>
    </details>
  );
}

function DiscountGroup({
  value,
  onChange,
  label,
}: {
  value: FilterState;
  onChange: (v: FilterState) => void;
  label: string;
}) {
  const options = [10, 25, 50];
  return (
    <details className={styles.group} open>
      <summary className={styles.groupTitle}>{label}</summary>
      <ul className={styles.list}>
        {options.map((d) => (
          <li key={d} className={styles.checkRow}>
            <label className={styles.checkLabel}>
              <input
                type="radio"
                name="discount"
                checked={value.discount === d}
                onChange={() => onChange({ ...value, discount: d })}
              />
              <span>{d}% or more</span>
            </label>
          </li>
        ))}
      </ul>
    </details>
  );
}