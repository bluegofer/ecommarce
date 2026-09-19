'use client';

import { useEffect, useState, useMemo } from 'react';
import { ordersApi, ApiError, type MyOrderListItem } from '@/lib/api';
import { OrderCard, type OrderCardLabels } from './OrderCard';
import styles from './OrdersList.module.css';

export interface OrdersListLabels extends OrderCardLabels {
  title: string;
  tabAll: string;
  tabInProgress: string;
  tabDelivered: string;
  tabCancelled: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyBody: string;
  startShopping: string;
  loading: string;
  errorText: string;
}

export interface OrdersListProps {
  locale: 'bn' | 'en';
  labels: OrdersListLabels;
}

type TabKey = 'all' | 'inProgress' | 'delivered' | 'cancelled';

const IN_PROGRESS = new Set(['PLACED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY']);

export function OrdersList({ locale, labels }: OrdersListProps) {
  const [orders, setOrders] = useState<MyOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await ordersApi.listMine();
        if (cancelled) return;
        setOrders(res);
      } catch (err) {
        if (cancelled) return;
        if (!(err instanceof ApiError && err.status === 401)) {
          setError(labels.errorText);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [labels.errorText]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (tab === 'inProgress' && !IN_PROGRESS.has(o.status)) return false;
      if (tab === 'delivered' && o.status !== 'DELIVERED') return false;
      if (tab === 'cancelled' && o.status !== 'CANCELLED' && o.status !== 'RETURNED') return false;
      if (q) {
        const needle = q.toLowerCase();
        const hay = `${o.orderNumber} ${o.firstItem?.title ?? ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [orders, tab, q]);

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'all', label: labels.tabAll },
    { key: 'inProgress', label: labels.tabInProgress },
    { key: 'delivered', label: labels.tabDelivered },
    { key: 'cancelled', label: labels.tabCancelled },
  ];

  return (
    <div className={styles.wrap}>
      <h1 className={styles.h1}>{labels.title}</h1>

      <div className={styles.controls}>
        <div className={styles.tabs} role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={[styles.tab, tab === t.key ? styles.tabActive : ''].filter(Boolean).join(' ')}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          className={styles.search}
          placeholder={labels.searchPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={labels.searchPlaceholder}
        />
      </div>

      {loading ? (
        <p className={styles.stateText}>{labels.loading}</p>
      ) : error ? (
        <p className={styles.stateText}>{error}</p>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>{labels.emptyTitle}</h2>
          <p className={styles.emptyBody}>{labels.emptyBody}</p>
          <a href={`/${locale}`} className={styles.cta}>{labels.startShopping}</a>
        </div>
      ) : (
        <ul className={styles.list}>
          {filtered.map((o) => (
            <li key={o.id}>
              <OrderCard locale={locale} order={o} labels={labels} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}