'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import type { SearchResponse, ProductSummary } from '@/lib/api/types';
import type { Dictionary } from '@/lib/i18n';
import { FilterRail, type FilterState } from './FilterRail';
import { FilterDrawer } from './FilterDrawer';
import { ActiveFilterChips } from './ActiveFilterChips';
import { ResultsBar } from './ResultsBar';
import { ProductGrid } from './ProductGrid';
import { NoResults } from './NoResults';
import type { SortValue } from '@/components/ui/Sort';
import { SkeletonCard } from '@/components/ui/Skeleton';
import styles from './PlpClient.module.css';

export interface PlpClientProps {
  initial: SearchResponse;
  heading?: string;
  recommended: ProductSummary[];
  locale: 'bn' | 'en';
  dict: Dictionary;
}

/** Suspense boundary — required because PlpInner uses useSearchParams(). */
export function PlpClient(props: PlpClientProps) {
  return (
    <Suspense fallback={<PlpFallback />}>
      <PlpInner {...props} />
    </Suspense>
  );
}

function PlpFallback() {
  return (
    <div className={styles.fallbackGrid}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

function PlpInner({ initial, heading, recommended, locale, dict }: PlpClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filterState = useMemo<FilterState>(() => {
    const brandParam = searchParams.get('brand');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const minRating = searchParams.get('minRating');
    const freeDelivery = searchParams.get('freeDelivery');
    const discount = searchParams.get('discount');
    return {
      brand: brandParam ? brandParam.split(',').filter(Boolean) : [],
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minRating: minRating ? Number(minRating) : undefined,
      freeDelivery: freeDelivery === '1',
      discount: discount ? Number(discount) : undefined,
    };
  }, [searchParams]);

  const sort = (searchParams.get('sort') as SortValue) || 'relevance';

  const updateUrl = useCallback(
    (params: Record<string, string | number | undefined | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') next.delete(k);
        else next.set(k, String(v));
      });
      if (
        'brand' in params ||
        'minPrice' in params ||
        'maxPrice' in params ||
        'minRating' in params ||
        'freeDelivery' in params ||
        'discount' in params ||
        'sort' in params
      ) {
        next.delete('page');
      }
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleFilterChange = useCallback(
    (next: FilterState) => {
      updateUrl({
        brand: next.brand.length > 0 ? next.brand.join(',') : undefined,
        minPrice: next.minPrice,
        maxPrice: next.maxPrice,
        minRating: next.minRating,
        freeDelivery: next.freeDelivery ? 1 : undefined,
        discount: next.discount,
      });
    },
    [updateUrl],
  );

  const handleSortChange = useCallback(
    (s: SortValue) => updateUrl({ sort: s }),
    [updateUrl],
  );

  const activeCount =
    filterState.brand.length +
    (filterState.minPrice !== undefined || filterState.maxPrice !== undefined ? 1 : 0) +
    (filterState.minRating !== undefined ? 1 : 0) +
    (filterState.freeDelivery ? 1 : 0) +
    (filterState.discount !== undefined ? 1 : 0);

  const filterLabels = {
    title: locale === 'bn' ? 'ফিল্টার' : 'Filters',
    price: locale === 'bn' ? 'মূল্য' : 'Price',
    brand: locale === 'bn' ? 'ব্র্যান্ড' : 'Brand',
    rating: locale === 'bn' ? 'রেটিং' : 'Rating',
    delivery: locale === 'bn' ? 'ডেলিভারি' : 'Delivery',
    discount: locale === 'bn' ? 'ছাড়' : 'Discount',
    apply: locale === 'bn' ? 'প্রয়োগ করুন' : 'Apply',
    showAll: locale === 'bn' ? 'সব দেখুন' : 'Show all',
    showLess: locale === 'bn' ? 'কম দেখুন' : 'Show less',
  };

  return (
    <div className={styles.layout}>
      <div className={styles.railWrap}>
        <FilterRail
          facets={initial.facets}
          value={filterState}
          onChange={handleFilterChange}
          locale={locale}
          labels={filterLabels}
        />
      </div>

      <div className={styles.main}>
        {heading ? <h1 className={styles.heading}>{heading}</h1> : null}

        <ResultsBar
          total={initial.total}
          sort={sort}
          onSortChange={handleSortChange}
          locale={locale}
          onOpenFilters={() => setDrawerOpen(true)}
          activeFilterCount={activeCount}
        />

        <ActiveFilterChips
          value={filterState}
          onChange={handleFilterChange}
          labelFor={{
            brand: (v) => (locale === 'bn' ? `ব্র্যান্ড: ${v}` : `Brand: ${v}`),
            price: (min, max) => {
              const minT = min ? `৳${Math.round(min / 100)}` : '';
              const maxT = max ? `৳${Math.round(max / 100)}` : '';
              return min && max ? `${minT} – ${maxT}` : min ? `${minT}+` : `≤ ${maxT}`;
            },
            rating: (n) => `★ ${n}+`,
            freeDelivery: locale === 'bn' ? 'ফ্রি ডেলিভারি' : 'Free Delivery',
            discount: (n) => (locale === 'bn' ? `${n}% বা বেশি ছাড়` : `${n}% or more off`),
            clearAll: locale === 'bn' ? 'সব মুছুন' : 'Clear all',
          }}
        />

        {initial.items.length === 0 ? (
          <NoResults
            query={searchParams.get('k') ?? undefined}
            recommended={recommended}
            locale={locale}
            dict={dict}
          />
        ) : (
          <ProductGrid products={initial.items} locale={locale} dict={dict} />
        )}
      </div>

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        facets={initial.facets}
        value={filterState}
        onApply={handleFilterChange}
        locale={locale}
        labels={filterLabels}
        resultCount={initial.total}
      />
    </div>
  );
}