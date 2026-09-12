'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import styles from './ConfirmationClient.module.css';

export interface LookupOrderDto {
  id: string;
  orderNumber: string;
  status: string;
  subtotalPoisha: number;
  discountPoisha: number;
  deliveryChargePoisha: number;
  totalPoisha: number;
  placedAt: string;
  contactPhone: string;
  contactEmail: string | null;
  shippingAddressJson: unknown;
  items: Array<{
    id: string;
    productTitleEn: string;
    productTitleBn: string;
    quantity: number;
    unitPricePoisha: number;
    lineTotalPoisha: number;
  }>;
  payments?: Array<{
    method: string;
    status: string;
    amountPoisha: number;
    gatewayRef: string | null;
  }>;
  shipments?: Array<{
    courier: string;
    trackingNumber: string | null;
    status: string;
  }>;
}

export interface ConfirmationLabels {
  heading: string;
  subhead: string;
  orderLabel: string;
  orderDate: string;
  items: string;
  subtotal: string;
  delivery: string;
  discount: string;
  total: string;
  free: string;
  payment: string;
  shippingTo: string;
  estimatedDelivery: string;
  trackOrder: string;
  continueShopping: string;
  downloadInvoice: string;
  guestTip: string;
  createAccount: string;
  loading: string;
  errorText: string;
  notFound: string;
  backHome: string;
}

export interface ConfirmationClientProps {
  locale: 'bn' | 'en';
  orderNumber: string;
  phone: string;
  labels: ConfirmationLabels;
}

interface LookupResponse {
  ok: boolean;
  order?: LookupOrderDto;
}

export function ConfirmationClient({
  locale,
  orderNumber,
  phone,
  labels,
}: ConfirmationClientProps) {
  const [order, setOrder] = useState<LookupOrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<LookupResponse>(
          `/orders/lookup?orderNumber=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`,
        );
        if (cancelled) return;
        if (!res.ok || !res.order) {
          setNotFound(true);
        } else {
          setOrder(res.order);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(labels.errorText);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderNumber, phone, labels.errorText]);

  const fmtPrice = (poisha: number) =>
    `৳${(poisha / 100).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD')}`;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const addr = (order?.shippingAddressJson as Record<string, unknown> | null) ?? null;
  const addrLine = (key: string) => (addr?.[key] ? String(addr[key]) : '');

  if (loading) {
    return (
      <div className={styles.wrap}>
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.state}>{labels.loading}</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.h1}>{labels.notFound}</h1>
        <p className={styles.state}>
          {locale === 'bn'
            ? 'অর্ডার নম্বর বা ফোন নম্বর মিলছে না।'
            : 'Order number or phone did not match.'}
        </p>
        <Link href={`/${locale}`} className={styles.secondaryBtn}>
          {labels.backHome}
        </Link>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.wrap}>
        <p className={styles.state}>{error ?? labels.errorText}</p>
        <Link href={`/${locale}`} className={styles.secondaryBtn}>
          {labels.backHome}
        </Link>
      </div>
    );
  }

  const payment = order.payments?.[0];
  const shipment = order.shipments?.[0];

  return (
    <div className={styles.wrap}>
      <div className={styles.hero}>
        <div className={styles.checkIcon} aria-hidden="true">
          <CheckIcon />
        </div>
        <h1 className={styles.h1}>{labels.heading}</h1>
        <p className={styles.subhead}>{labels.subhead}</p>
        <p className={styles.orderNum}>
          {labels.orderLabel}: <strong>#{order.orderNumber}</strong>
        </p>
        <p className={styles.orderDate}>
          {labels.orderDate}: {fmtDate(order.placedAt)}
        </p>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{labels.items}</h2>
        <ul className={styles.itemList}>
          {order.items.map((it) => {
            const title = locale === 'bn' ? it.productTitleBn : it.productTitleEn;
            return (
              <li key={it.id} className={styles.item}>
                <div className={styles.itemImg} aria-hidden="true" />
                <div className={styles.itemInfo}>
                  <span className={styles.itemTitle}>{title}</span>
                  <span className={styles.itemMeta}>×{it.quantity}</span>
                </div>
                <span className={styles.itemTotal}>{fmtPrice(it.lineTotalPoisha)}</span>
              </li>
            );
          })}
        </ul>

        <dl className={styles.totals}>
          <div className={styles.totalRow}>
            <dt>{labels.subtotal}</dt>
            <dd>{fmtPrice(order.subtotalPoisha)}</dd>
          </div>
          <div className={styles.totalRow}>
            <dt>{labels.delivery}</dt>
            <dd>
              {order.deliveryChargePoisha === 0
                ? labels.free
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

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{labels.payment}</h2>
        {payment ? (
          <p className={styles.paymentRow}>
            <strong>{payment.method}</strong>
            {payment.gatewayRef ? ` · Ref: ${payment.gatewayRef}` : ''}
          </p>
        ) : (
          <p className={styles.muted}>—</p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{labels.shippingTo}</h2>
        <address className={styles.address}>
          <strong>{addrLine('recipientName')}</strong>
          {addrLine('line1') ? <span>{addrLine('line1')}</span> : null}
          {addrLine('line2') ? <span>{addrLine('line2')}</span> : null}
          <span>
            {[addrLine('area'), addrLine('city'), addrLine('postcode')]
              .filter(Boolean)
              .join(', ')}
          </span>
          <span>📞 {order.contactPhone}</span>
        </address>
        {shipment ? (
          <p className={styles.shipmentRow}>
            {shipment.courier}
            {shipment.trackingNumber ? ` · ${shipment.trackingNumber}` : ''}
          </p>
        ) : (
          <p className={styles.eta}>{labels.estimatedDelivery}</p>
        )}
      </section>

      <div className={styles.actions}>
        <Link href={`/${locale}/account/orders`} className={styles.primaryBtn}>
          {labels.trackOrder}
        </Link>
        <Link href={`/${locale}`} className={styles.secondaryBtn}>
          {labels.continueShopping}
        </Link>
        <Link
          href={`/${locale}/signin?next=${encodeURIComponent(`/${locale}/account/orders`)}`}
          className={styles.ghostBtn}
        >
          {labels.downloadInvoice}
        </Link>
      </div>

      <aside className={styles.guestPanel}>
        <span className={styles.guestIcon} aria-hidden="true">💡</span>
        <p className={styles.guestText}>{labels.guestTip}</p>
        <Link
          href={`/${locale}/register`}
          className={styles.guestCta}
        >
          {labels.createAccount} →
        </Link>
      </aside>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}