import Link from 'next/link';
import { StatusChip, type StatusChipLabels } from './StatusChip';
import type { MyOrderListItem } from '@/lib/api';
import styles from './OrderCard.module.css';

export interface OrderCardLabels {
  orderNumber: string;
  placed: string;
  total: string;
  trackPackage: string;
  returnItems: string;
  reorder: string;
  cancelledReason: string;
  statusLabels: StatusChipLabels;
}

export interface OrderCardProps {
  locale: 'bn' | 'en';
  order: MyOrderListItem;
  labels: OrderCardLabels;
}

export function OrderCard({ locale, order, labels }: OrderCardProps) {
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  const fmtPrice = (poisha: number) =>
    `৳${(poisha / 100).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD')}`;

  const isCancelled = order.status === 'CANCELLED';

  return (
    <article className={styles.card}>
      <header className={styles.head}>
        <div className={styles.headLeft}>
          <span className={styles.headItem}>
            <span className={styles.headLabel}>{labels.orderNumber}</span>
            <span className={styles.headValue}>#{order.orderNumber}</span>
          </span>
          <span className={styles.headItem}>
            <span className={styles.headLabel}>{labels.placed}</span>
            <span className={styles.headValue}>{fmtDate(order.placedAt)}</span>
          </span>
        </div>
        <div className={styles.headRight}>
          <span className={styles.headLabel}>{labels.total}</span>
          <span className={styles.totalValue}>{fmtPrice(order.totalPoisha)}</span>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.thumb} aria-hidden="true">
          {order.firstItem?.imageUrl ? (
            <img src={order.firstItem.imageUrl} alt="" loading="lazy" />
          ) : (
            <div className={styles.thumbPlaceholder} />
          )}
        </div>
        <div className={styles.info}>
          <p className={styles.title}>
            {order.firstItem?.title ?? ''}
            {order.itemCount > 1 ? ` +${order.itemCount - 1}` : ''}
          </p>
          <StatusChip status={order.status} labels={labels.statusLabels} />
        </div>
        <div className={styles.actions}>
          {!isCancelled ? (
            <>
              <Link
                href={`/${locale}/account/orders/${order.id}`}
                className={styles.primaryBtn}
              >
                {labels.trackPackage}
              </Link>
              {order.status === 'DELIVERED' ? (
                <Link
                  href={`/${locale}/account/orders/${order.id}#return`}
                  className={styles.ghostBtn}
                >
                  {labels.returnItems}
                </Link>
              ) : null}
            </>
          ) : (
            <Link
              href={`/${locale}/account/orders/${order.id}`}
              className={styles.ghostBtn}
            >
              {labels.reorder}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}