'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { accountApi, ordersApi, ApiError, type MeProfile, type MyOrderListItem } from '@/lib/api';
import { AccountCard } from './AccountCard';
import styles from './AccountOverview.module.css';

export interface AccountOverviewLabels {
  greeting: string;
  overview: string;
  orders: string;
  ordersSub: string;
  addresses: string;
  addressesSub: string;
  settings: string;
  settingsSub: string;
  wishlist: string;
  wishlistSub: string;
  recentOrders: string;
  viewAll: string;
  noOrders: string;
  startShopping: string;
  loading: string;
}

export interface AccountOverviewProps {
  locale: 'bn' | 'en';
  labels: AccountOverviewLabels;
}

export function AccountOverview({ locale, labels }: AccountOverviewProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [orders, setOrders] = useState<MyOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, o] = await Promise.all([
          accountApi.getProfile(),
          ordersApi.listMine(),
        ]);
        if (cancelled) return;
        setProfile(p);
        setOrders(o.slice(0, 2));
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          // AuthProvider will redirect; no need to show error
        } else {
          setError(labels.loading);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [labels.loading]);

  const name = profile?.fullName || user?.fullName || user?.phone || '';
  const base = `/${locale}/account`;

  const fmt = (poisha: number) =>
    `৳${(poisha / 100).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD')}`;

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <h1 className={styles.h1}>{labels.overview}</h1>
        <p className={styles.greeting}>
          {labels.greeting.replace('{name}', name)}
        </p>
      </header>

      <section className={styles.grid} aria-label={labels.overview}>
        <AccountCard
          href={`${base}/orders`}
          title={labels.orders}
          subtitle={labels.ordersSub}
          icon={<IconOrders />}
        />
        <AccountCard
          href={`${base}/addresses`}
          title={labels.addresses}
          subtitle={labels.addressesSub}
          icon={<IconPin />}
        />
        <AccountCard
          href={`${base}/wishlist`}
          title={labels.wishlist}
          subtitle={labels.wishlistSub}
          icon={<IconHeart />}
        />
        <AccountCard
          href={`${base}/settings`}
          title={labels.settings}
          subtitle={labels.settingsSub}
          icon={<IconGear />}
        />
      </section>

      <section className={styles.recent} aria-label={labels.recentOrders}>
        <div className={styles.recentHead}>
          <h2 className={styles.h2}>{labels.recentOrders}</h2>
          <Link href={`${base}/orders`} className={styles.viewAll}>{labels.viewAll}</Link>
        </div>

        {loading ? (
          <div className={styles.skeletonRow} aria-hidden="true">
            <div className={styles.skeleton} />
            <div className={styles.skeleton} />
          </div>
        ) : error ? (
          <p className={styles.emptyText}>{error}</p>
        ) : orders.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>{labels.noOrders}</p>
            <Link href={`/${locale}`} className={styles.cta}>{labels.startShopping}</Link>
          </div>
        ) : (
          <ul className={styles.orderList}>
            {orders.map((o) => (
              <li key={o.id} className={styles.orderRow}>
                <div className={styles.orderImg} aria-hidden="true">
                  {o.firstItem?.imageUrl ? (
                    <img src={o.firstItem.imageUrl} alt="" loading="lazy" />
                  ) : (
                    <div className={styles.orderImgPlaceholder} />
                  )}
                </div>
                <div className={styles.orderInfo}>
                  <span className={styles.orderNum}>#{o.orderNumber}</span>
                  <span className={styles.orderItemTitle}>
                    {o.firstItem?.title ?? ''}{o.itemCount > 1 ? ` +${o.itemCount - 1}` : ''}
                  </span>
                  <span className={styles.orderStatus}>{o.status}</span>
                </div>
                <div className={styles.orderTotal}>{fmt(o.totalPoisha)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function IconOrders() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M3 7l9 4 9-4M12 11v10" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconHeart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s-7-4.5-9-9a5 5 0 019-4 5 5 0 019 4c-2 4.5-9 9-9 9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function IconGear() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5v.2a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H2a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H8a1.7 1.7 0 001-1.5V2a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V8a1.7 1.7 0 001.5 1h.2a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}