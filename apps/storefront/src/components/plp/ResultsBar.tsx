'use client';

import { Sort, type SortValue } from '@/components/ui/Sort';
import styles from './ResultsBar.module.css';

export interface ResultsBarProps {
  total: number;
  sort: SortValue;
  onSortChange: (v: SortValue) => void;
  locale: 'bn' | 'en';
  /** Fires when user taps the Filters button (mobile/tablet only). */
  onOpenFilters: () => void;
  /** Number of active filters, for the Filters button badge. */
  activeFilterCount: number;
}

export function ResultsBar({
  total,
  sort,
  onSortChange,
  locale,
  onOpenFilters,
  activeFilterCount,
}: ResultsBarProps) {
  const sortOptions = [
    { value: 'featured' as const,     label: locale === 'bn' ? 'ফিচার্ড' : 'Featured' },
    { value: 'price_asc' as const,    label: locale === 'bn' ? 'দাম: কম → বেশি' : 'Price: Low to High' },
    { value: 'price_desc' as const,   label: locale === 'bn' ? 'দাম: বেশি → কম' : 'Price: High to Low' },
    { value: 'newest' as const,       label: locale === 'bn' ? 'নতুন' : 'Newest' },
    { value: 'rating' as const,       label: locale === 'bn' ? 'রেটিং' : 'Avg. Customer Review' },
    { value: 'best_sellers' as const, label: locale === 'bn' ? 'বেস্ট সেলার' : 'Best Sellers' },
  ];

  return (
    <div className={styles.bar}>
      <span className={styles.count}>
        {locale === 'bn' ? `${total}টি ফলাফল` : `${total} results`}
      </span>

      <button
        type="button"
        className={styles.filtersBtn}
        onClick={onOpenFilters}
        aria-label={locale === 'bn' ? 'ফিল্টার' : 'Filters'}
      >
        <FilterIcon />
        <span>{locale === 'bn' ? 'ফিল্টার' : 'Filters'}</span>
        {activeFilterCount > 0 ? <span className={styles.badge}>{activeFilterCount}</span> : null}
      </button>

      <div className={styles.sortWrap}>
        <Sort value={sort} options={sortOptions} onChange={onSortChange} label={locale === 'bn' ? 'সাজান' : 'Sort'} />
      </div>
    </div>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M6 12h12M10 18h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}