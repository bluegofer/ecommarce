'use client';

import Link from 'next/link';
import type { FlashSaleItem } from '@/lib/api';
import styles from './DealCard.module.css';

export interface DealCardLabels {
  claimDeal: string;
  claimedLabel: string;
  soldOut: string;
  ended: string;
}

export interface DealCardProps {
  locale: 'bn' | 'en';
  item: FlashSaleItem;
  /** Server-synced endsAt ISO for the parent sale. */
  endsAt: string;
  /** Server clock offset (ms) so countdown is accurate. */
  clockOffsetMs: number;
  labels: DealCardLabels;
}

function fmtPrice(poisha: number, locale: 'bn' | 'en') {
  return `৳${(poisha / 100).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD')}`;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function DealCard({
  locale,
  item,
  endsAt,
  clockOffsetMs,
  labels,
}: DealCardProps) {
  const now = Date.now() + clockOffsetMs;
  const endsAtMs = new Date(endsAt).getTime();
  const remainingMs = Math.max(0, endsAtMs - now);
  const ended = remainingMs <= 0;
  const soldOut =
    item.capQuantity !== null && item.soldQuantity >= item.capQuantity;

  const percent = Math.min(100, Math.round(item.percentClaimed));

  return (
    <article className={[styles.card, soldOut || ended ? styles.muted : ''].filter(Boolean).join(' ')}>
      <div className={styles.img} aria-hidden="true">
        <div className={styles.imgPlaceholder} />
      </div>

      <div className={styles.body}>
        <span className={styles.title} title={item.variantId}>
          {locale === 'bn' ? 'ফ্ল্যাশ ডিল' : 'Flash deal'} · {item.variantId.slice(0, 8)}
        </span>

        <span className={styles.price}>{fmtPrice(item.dealPricePoisha, locale)}</span>

        <div className={styles.progressWrap}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${percent}%` }}
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <span className={styles.progressLabel}>
            {percent}% {labels.claimedLabel}
          </span>
        </div>

        <div className={styles.footer}>
          {ended ? (
            <span className={styles.endedChip}>{labels.ended}</span>
          ) : soldOut ? (
            <span className={styles.soldOutChip}>{labels.soldOut}</span>
          ) : (
            <>
              <span className={styles.timer} aria-label="Time remaining">
                ⏱ {formatRemaining(remainingMs)}
              </span>
              <Link
                href={`/${locale}/p/${item.variantId}`}
                className={styles.claimBtn}
              >
                {labels.claimDeal}
              </Link>
            </>
          )}
        </div>
      </div>
    </article>
  );
}