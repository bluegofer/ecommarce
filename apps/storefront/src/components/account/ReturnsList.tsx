'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { returnsApi, ApiError, type MyReturnItem } from '@/lib/api';
import styles from './ReturnsList.module.css';

export interface ReturnsListLabels {
  title: string;
  emptyTitle: string;
  emptyBody: string;
  findSomething: string;
  orderLabel: string;
  reasonLabel: string;
  refundLabel: string;
  requestedLabel: string;
  resolvedLabel: string;
  loading: string;
  errorText: string;
}

export interface ReturnsListProps {
  locale: 'bn' | 'en';
  labels: ReturnsListLabels;
}

const STATUS_TONE: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  REQUESTED: 'warning',
  APPROVED: 'info',
  PICKED_UP: 'info',
  RECEIVED: 'info',
  RESOLVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

const STATUS_LABEL_EN: Record<string, string> = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  PICKED_UP: 'Picked up',
  RECEIVED: 'Received',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

const STATUS_LABEL_BN: Record<string, string> = {
  REQUESTED: 'অনুরোধ',
  APPROVED: 'অনুমোদিত',
  PICKED_UP: 'সংগৃহীত',
  RECEIVED: 'প্রাপ্ত',
  RESOLVED: 'সমাধান',
  REJECTED: 'প্রত্যাখ্যাত',
  CANCELLED: 'বাতিল',
};

export function ReturnsList({ locale, labels }: ReturnsListProps) {
  const [items, setItems] = useState<MyReturnItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await returnsApi.listMine();
        if (!cancelled) setItems(res);
      } catch (err) {
        if (cancelled) return;
        if (!(err instanceof ApiError && err.status === 401)) {
          setError(labels.errorText);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [labels.errorText]);

  const fmtPrice = (poisha: number) =>
    `৳${(poisha / 100).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD')}`;

  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—';

  const statusLabel = (code: string) =>
    (locale === 'bn' ? STATUS_LABEL_BN : STATUS_LABEL_EN)[code] ?? code;

  if (error) return <p className={styles.state}>{error}</p>;
  if (items === null) return <p className={styles.state}>{labels.loading}</p>;

  if (items.length === 0) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.h1}>{labels.title}</h1>
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>{labels.emptyTitle}</h2>
          <p className={styles.emptyBody}>{labels.emptyBody}</p>
          <Link href={`/${locale}/account/orders`} className={styles.cta}>
            {labels.findSomething}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.h1}>{labels.title}</h1>
      <ul className={styles.list}>
        {items.map((it) => {
          const tone = STATUS_TONE[it.status] ?? 'neutral';
          return (
            <li key={it.id} className={styles.card}>
              <div className={styles.row}>
                <div className={styles.left}>
                  <Link
                    href={`/${locale}/account/orders/${it.orderId}`}
                    className={styles.orderLink}
                  >
                    #{it.orderNumber}
                  </Link>
                  <span className={[styles.chip, styles[tone]].filter(Boolean).join(' ')}>
                    {statusLabel(it.status)}
                  </span>
                </div>
                <span className={styles.refund}>{fmtPrice(it.refundAmountPoisha)}</span>
              </div>
              <div className={styles.meta}>
                <span>
                  {labels.reasonLabel}: <strong>{it.reason}</strong>
                </span>
                <span>
                  {labels.requestedLabel}: {fmtDate(it.requestedAt)}
                </span>
                {it.resolvedAt ? (
                  <span>
                    {labels.resolvedLabel}: {fmtDate(it.resolvedAt)}
                  </span>
                ) : null}
              </div>
              {it.note ? <p className={styles.note}>{it.note}</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}