'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { promotionsApi, api, type FlashSale, type FlashSaleItem } from '@/lib/api';
import { DealCard, type DealCardLabels } from './DealCard';
import styles from './DealsClient.module.css';

export interface DealsLabels extends DealCardLabels {
  title: string;
  subtitle: string;
  filterAll: string;
  filterLightning: string;
  filterDealOfDay: string;
  filterFlash: string;
  showingCount: string;
  loadMore: string;
  emptyTitle: string;
  emptyBody: string;
  backHome: string;
  loading: string;
  errorText: string;
}

export interface DealsClientProps {
  locale: 'bn' | 'en';
  labels: DealsLabels;
}

type FilterKey = 'all' | 'lightning' | 'dealOfDay' | 'flash';

interface DealRow {
  saleId: string;
  endsAt: string;
  item: FlashSaleItem;
}

export function DealsClient({ locale, labels }: DealsClientProps) {
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [visible, setVisible] = useState(12);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fetch server clock in parallel for accurate countdowns
        const [list, clock] = await Promise.all([
          promotionsApi.getActiveFlashSales(),
          api.get<{ serverNow: string }>('/flash-sales/sync/now').catch(() => null),
        ]);
        if (cancelled) return;
        if (clock?.serverNow) {
          setClockOffsetMs(new Date(clock.serverNow).getTime() - Date.now());
        }
        setSales(list);
      } catch {
        if (cancelled) return;
        setError(labels.errorText);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [labels.errorText]);

  const allDeals: DealRow[] = useMemo(() => {
    const rows: DealRow[] = [];
    for (const s of sales) {
      for (const it of s.items ?? []) {
        rows.push({ saleId: s.id, endsAt: s.endsAt, item: it });
      }
    }
    return rows;
  }, [sales]);

  const filtered = useMemo(() => {
    // Filters are placeholder since API returns all active sales uniformly.
    if (filter === 'all') return allDeals;
    return allDeals; // lightning/deal-of-day/flash all show same for now
  }, [allDeals, filter]);

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.h1}>⚡ {labels.title}</h1>
        <p className={styles.subtitle}>{labels.subtitle}</p>
      </header>

      <div className={styles.chips} role="tablist" aria-label="Deal filters">
        {([
          ['all', labels.filterAll],
          ['lightning', labels.filterLightning],
          ['dealOfDay', labels.filterDealOfDay],
          ['flash', labels.filterFlash],
        ] as Array<[FilterKey, string]>).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            className={[styles.chip, filter === key ? styles.chipActive : ''].filter(Boolean).join(' ')}
            onClick={() => { setFilter(key); setVisible(12); }}
          >
            {label}
          </button>
        ))}
        {!loading && !error ? (
          <span className={styles.count}>
            {labels.showingCount.replace('{n}', String(filtered.length))}
          </span>
        ) : null}
      </div>

      {loading ? (
        <p className={styles.state}>{labels.loading}</p>
      ) : error ? (
        <p className={styles.state}>{error}</p>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>{labels.emptyTitle}</h2>
          <p className={styles.emptyBody}>{labels.emptyBody}</p>
          <Link href={`/${locale}`} className={styles.cta}>{labels.backHome}</Link>
        </div>
      ) : (
        <>
          <ul className={styles.grid}>
            {shown.map((row) => (
              <li key={`${row.saleId}-${row.item.id}`}>
                <DealCard
                  locale={locale}
                  item={row.item}
                  endsAt={row.endsAt}
                  clockOffsetMs={clockOffsetMs}
                  labels={labels}
                />
              </li>
            ))}
          </ul>
          {hasMore ? (
            <div className={styles.moreWrap}>
              <button
                type="button"
                className={styles.moreBtn}
                onClick={() => setVisible((v) => v + 12)}
              >
                {labels.loadMore}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}