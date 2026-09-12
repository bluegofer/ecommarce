'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ordersApi, ApiError, type MyOrderDetail } from '@/lib/api';
import { StatusChip, type StatusChipLabels } from './StatusChip';
import { TrackingTimeline, type TrackingTimelineLabels } from './TrackingTimeline';
import styles from './OrderTracking.module.css';

export interface OrderTrackingLabels {
  loading: string;
  errorText: string;
  backToOrders: string;
  needHelp: string;
  orderItems: string;
  shippingTo: string;
  payment: string;
  paidLabel: string;
  pendingLabel: string;
  codLabel: string;
  subtotal: string;
  delivery: string;
  discount: string;
  total: string;
  freeDelivery: string;
  couponLabel: string;
  downloadInvoice: string;
  statusLabels: StatusChipLabels;
  timeline: TrackingTimelineLabels;
  copied: string;
}

export interface OrderTrackingProps {
  locale: 'bn' | 'en';
  orderId: string;
  labels: OrderTrackingLabels;
}

export function OrderTracking({ locale, orderId, labels }: OrderTrackingProps) {
  const [order, setOrder] = useState<MyOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await ordersApi.findMine(orderId);
        if (cancelled) return;
        setOrder(res);
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
  }, [orderId, labels.errorText]);

  const fmtPrice = (poisha: number) =>
    `৳${(poisha / 100).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD')}`;

  const addr = (order?.shippingAddressJson as Record<string, unknown> | null) ?? null;
  const addrLine = (key: string) => (addr?.[key] ? String(addr[key]) : '');

  const onCopy = async () => {
    if (!order?.trackingNumber) return;
    try {
      await navigator.clipboard.writeText(order.trackingNumber);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (loading) {
    return <p className={styles.state}>{labels.loading}</p>;
  }
  if (error || !order) {
    return <p className={styles.state}>{error ?? labels.errorText}</p>;
  }

  const isCod = order.contactPhone ? false : true; // placeholder — payment method not in current DTO
  const paymentLabel = isCod ? labels.codLabel : labels.paidLabel;

  return (
    <div className={styles.wrap}>
      <div className={styles.topBar}>
        <Link href={`/${locale}/account/orders`} className={styles.backLink}>
          ← {labels.backToOrders}
        </Link>
        <a href={`/${locale}/pages/contact`} className={styles.helpLink}>
          {labels.needHelp}
        </a>
      </div>

      <header className={styles.header}>
        <div>
          <h1 className={styles.orderNum}>#{order.orderNumber}</h1>
          <p className={styles.orderDate}>
            {new Date(order.placedAt).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <StatusChip status={order.status} labels={labels.statusLabels} />
      </header>

      <div className={styles.grid}>
        {/* Left: items + timeline */}
        <div className={styles.main}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{labels.orderItems}</h2>
            <ul className={styles.itemList}>
              {order.items.map((it) => (
                <li key={it.id} className={styles.item}>
                  <div className={styles.itemThumb} aria-hidden="true">
                    {it.imageUrl ? (
                      <img src={it.imageUrl} alt="" loading="lazy" />
                    ) : (
                      <div className={styles.itemThumbPlaceholder} />
                    )}
                  </div>
                  <div className={styles.itemInfo}>
                    <p className={styles.itemTitle}>{it.titleEn}</p>
                    <p className={styles.itemSku}>SKU: {it.variantId.slice(0, 8)}</p>
                  </div>
                  <div className={styles.itemQty}>
                    <span className={styles.itemQtyLabel}>×{it.quantity}</span>
                    <span className={styles.itemLineTotal}>{fmtPrice(it.lineTotalPoisha)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Timeline</h2>
            <TrackingTimeline
              locale={locale}
              currentStatus={order.status}
              events={order.statusHistory}
              labels={labels.timeline}
            />
          </section>
        </div>

        {/* Right: shipping + payment + totals */}
        <aside className={styles.side}>
          {order.trackingNumber ? (
            <section className={styles.card}>
              <h3 className={styles.cardTitle}>{order.courierName ?? 'Courier'}</h3>
              <div className={styles.trackRow}>
                <span className={styles.trackNum}>{order.trackingNumber}</span>
                <button
                  type="button"
                  className={styles.copyBtn}
                  onClick={onCopy}
                  aria-label="Copy tracking number"
                >
                  <CopyIcon />
                </button>
              </div>
              {copyToast ? <span className={styles.copiedToast}>{labels.copied}</span> : null}
            </section>
          ) : null}

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>{labels.shippingTo}</h3>
            <address className={styles.address}>
              <strong>{addrLine('recipientName')}</strong>
              {addrLine('line1') ? <span>{addrLine('line1')}</span> : null}
              {addrLine('line2') ? <span>{addrLine('line2')}</span> : null}
              <span>
                {[addrLine('area'), addrLine('city'), addrLine('postcode')]
                  .filter(Boolean)
                  .join(', ')}
              </span>
              {order.contactPhone ? <span>📞 {order.contactPhone}</span> : null}
            </address>
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>{labels.payment}</h3>
            <span className={styles.paymentLabel}>{paymentLabel}</span>
          </section>

          <section className={styles.card}>
            <dl className={styles.totals}>
              <div className={styles.totalRow}>
                <dt>{labels.subtotal}</dt>
                <dd>{fmtPrice(order.subtotalPoisha)}</dd>
              </div>
              <div className={styles.totalRow}>
                <dt>{labels.delivery}</dt>
                <dd>
                  {order.deliveryChargePoisha === 0
                    ? labels.freeDelivery
                    : fmtPrice(order.deliveryChargePoisha)}
                </dd>
              </div>
              {order.discountPoisha > 0 ? (
                <div className={[styles.totalRow, styles.discountRow].join(' ')}>
                  <dt>{labels.discount}</dt>
                  <dd>−{fmtPrice(order.discountPoisha)}</dd>
                </div>
              ) : null}
              <div className={[styles.totalRow, styles.grandTotal].join(' ')}>
                <dt>{labels.total}</dt>
                <dd>{fmtPrice(order.totalPoisha)}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 15V5a2 2 0 012-2h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}