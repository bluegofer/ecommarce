'use client';

import { RatingStars } from '@/components/ui/RatingStars';
import styles from './ReviewsBlock.module.css';

export interface ReviewSummary {
  average: number;
  count: number;
  histogram: { stars: 5 | 4 | 3 | 2 | 1; count: number }[];
}

export interface ReviewItem {
  id: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  verified: boolean;
}

export interface ReviewsBlockProps {
  summary: ReviewSummary;
  reviews: ReviewItem[];
  locale: 'bn' | 'en';
  labels: {
    title: string;
    writeReview: string;
    globalRatings: string;
    noReviews: string;
    verified: string;
    helpful: string;
    loadMore: string;
  };
  /** CTA click handler (opens write-review modal — Step 8.10). */
  onWriteReview?: () => void;
}

export function ReviewsBlock({ summary, reviews, locale, labels, onWriteReview }: ReviewsBlockProps) {
  if (summary.count === 0) {
    return (
      <section className={styles.wrap}>
        <div className={styles.empty}>
          <h3 className={styles.title}>{labels.title}</h3>
          <p className={styles.emptyMsg}>{labels.noReviews}</p>
          {onWriteReview ? (
            <button type="button" className={styles.writeBtn} onClick={onWriteReview}>
              {labels.writeReview}
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.wrap} id="reviews">
      <h3 className={styles.title}>{labels.title}</h3>

      <div className={styles.summary}>
        <div className={styles.summaryLeft}>
          <div className={`${styles.bigAvg} sk-tabular`}>{summary.average.toFixed(1)}</div>
          <RatingStars average={summary.average} count={summary.count} size={20} locale={locale} />
          <div className={styles.countText}>
            {summary.count.toLocaleString('en-US')} {labels.globalRatings}
          </div>
        </div>

        <div className={styles.summaryRight}>
          {summary.histogram.map((row) => {
            const pct = summary.count > 0 ? (row.count / summary.count) * 100 : 0;
            return (
              <div key={row.stars} className={styles.histRow}>
                <span className={styles.histLabel}>{row.stars}★</span>
                <div className={styles.histBar}>
                  <div className={styles.histFill} style={{ width: `${pct}%` }} />
                </div>
                <span className={`${styles.histPct} sk-tabular`}>{Math.round(pct)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {onWriteReview ? (
        <button type="button" className={styles.writeBtn} onClick={onWriteReview}>
          {labels.writeReview}
        </button>
      ) : null}

      <ul className={styles.list}>
        {reviews.map((r) => (
          <li key={r.id} className={styles.item}>
            <div className={styles.itemHead}>
              <div className={styles.avatar} aria-hidden="true">
                {r.authorName.charAt(0).toUpperCase()}
              </div>
              <div className={styles.itemMeta}>
                <div className={styles.authorName}>{r.authorName}</div>
                <div className={styles.itemSub}>
                  <RatingStars average={r.rating} count={0} size={14} locale={locale} />
                  <span className={styles.date}>{formatDate(r.createdAt, locale)}</span>
                  {r.verified ? <span className={styles.verified}>✓ {labels.verified}</span> : null}
                </div>
              </div>
            </div>
            <h4 className={styles.itemTitle}>{r.title}</h4>
            <p className={styles.itemBody}>{r.body}</p>
            <button type="button" className={styles.helpful}>
              {labels.helpful}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatDate(iso: string, locale: 'bn' | 'en'): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}