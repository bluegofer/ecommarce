'use client';

import { Drawer } from '@/components/ui/Drawer';
import type { SearchFacets } from '@/lib/api/types';
import { FilterRail, type FilterState } from './FilterRail';
import styles from './FilterDrawer.module.css';

export interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  facets: SearchFacets;
  value: FilterState;
  onApply: (next: FilterState) => void;
  locale: 'bn' | 'en';
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
  /** Number of results to show on Apply button. */
  resultCount: number;
}

export function FilterDrawer({ open, onClose, onApply, value, resultCount, labels, ...rest }: FilterDrawerProps) {
  // Drawer applies immediately on change, so Apply just closes.
  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel={labels.title}
      side="right"
      width={320}
      title={labels.title}
    >
      <div className={styles.body}>
        <FilterRail
          {...rest}
          value={value}
          onChange={onApply}
          labels={labels}
        />
      </div>
      <div className={styles.stickyFooter}>
        <button type="button" className={styles.applyBtn} onClick={onClose}>
          {labels.apply} ({resultCount})
        </button>
      </div>
    </Drawer>
  );
}