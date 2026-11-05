'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './MyReviewsList.module.css';

interface ReviewRow {
  id: string;
  productId: string;
  productTitle?: string;
  rating: number;
  title: string | null;
  body: string;
  status: 'PENDING' | 'PUBLISHED' | 'HIDDEN';
  createdAt: string;
}

export interface MyReviewsListProps {
  locale: string;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? '#f5a623' : 'none'} stroke={filled ? '#f5a623' : '#cbd5e1'} strokeWidth="1.5" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

const STATUS_LABEL: Record<string, { en: string; bn: string }> = {
  PENDING: { en: 'Pending review', bn: 'পর্যালোচনার অপেক্ষায়' },
  PUBLISHED: { en: 'Published', bn: 'প্রকাশিত' },
  HIDDEN: { en: 'Hidden', bn: 'লুকানো' },
};

export function MyReviewsList({ locale }: MyReviewsListProps) {
  const bn = locale === 'bn';
  const [items, setItems] = useState<ReviewRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/reviews/me/all', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'));
  }, []);

  if (error) return <p className={styles.state}>{error}</p>;
  if (items === null) return <p className={styles.state}>{bn ? 'লোড হচ্ছে…' : 'Loading…'}</p>;

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <h2 className={styles.emptyTitle}>{bn ? 'এখনো কোনো রিভিউ নেই' : 'No reviews yet'}</h2>
        <p className={styles.emptyBody}>
          {bn ? 'ডেলিভারি হওয়া অর্ডার থেকে রিভিউ লিখতে পারবেন।' : 'Write a review from any delivered order.'}
        </p>
        <Link href={`/${locale}/account/orders`} className={styles.cta}>
          {bn ? 'আমার অর্ডার দেখুন' : 'View my orders'}
        </Link>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {items.map((r) => (
        <li key={r.id} className={styles.card}>
          <div className={styles.row}>
            <div className={styles.left}>
              <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={styles.star}>
                    <StarIcon filled={n <= r.rating} />
                  </span>
                ))}
              </div>
              {r.title && <h3 className={styles.title}>{r.title}</h3>}
            </div>
            <span className={styles.chip}>{STATUS_LABEL[r.status]?.[bn ? 'bn' : 'en'] ?? r.status}</span>
          </div>
          <p className={styles.body}>{r.body}</p>
          <p className={styles.meta}>
            {new Date(r.createdAt).toLocaleDateString(bn ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </li>
      ))}
    </ul>
  );
}