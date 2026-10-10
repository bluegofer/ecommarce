// apps/storefront/src/components/account/ReturnTimeline.tsx
'use client';

import type { ReturnEvent } from '@/lib/api/returns';
import styles from './ReturnTimeline.module.css';

export interface ReturnTimelineProps {
  events: ReturnEvent[];
  locale: string;
}

const STEPS = ['REQUESTED', 'APPROVED', 'PICKED_UP', 'RECEIVED', 'RESOLVED'] as const;

const LABELS: Record<string, { en: string; bn: string }> = {
  REQUESTED: { en: 'Requested', bn: 'অনুরোধ করা হয়েছে' },
  APPROVED: { en: 'Approved', bn: 'অনুমোদিত' },
  PICKED_UP: { en: 'Picked up', bn: 'পিকআপ হয়েছে' },
  RECEIVED: { en: 'Received', bn: 'গৃহীত' },
  RESOLVED: { en: 'Resolved', bn: 'সমাধান হয়েছে' },
  REJECTED: { en: 'Rejected', bn: 'প্রত্যাখ্যাত' },
};

export function ReturnTimeline({ events, locale }: ReturnTimelineProps) {
  const bn = locale === 'bn';
  const currentStatus = events[events.length - 1]?.toStatus ?? 'REQUESTED';
  const isRejected = currentStatus === 'REJECTED';
  const currentIdx = STEPS.indexOf(currentStatus as typeof STEPS[number]);

  return (
    <div className={styles.wrap}>
      <ol className={styles.timeline}>
        {STEPS.map((step, i) => {
          const done = currentIdx >= i || (isRejected && i <= 1);
          const isCurrent = step === currentStatus;
          return (
            <li key={step} className={`${styles.step} ${done ? styles.done : ''} ${isCurrent ? styles.current : ''}`}>
              <span className={styles.dot} />
              <span className={styles.label}>{bn ? LABELS[step]?.bn : LABELS[step]?.en}</span>
            </li>
          );
        })}
        {isRejected && (
          <li className={`${styles.step} ${styles.rejected}`}>
            <span className={styles.dot} />
            <span className={styles.label}>{bn ? (LABELS.REJECTED?.bn ?? 'প্রত্যাখ্যাত') : (LABELS.REJECTED?.en ?? 'Rejected')}</span>
          </li>
        )}
      </ol>

      {events.length > 0 && (
        <div className={styles.log}>
          <h4 className={styles.logTitle}>{bn ? 'ইতিহাস' : 'History'}</h4>
          <ul className={styles.logList}>
            {events.map((e) => (
              <li key={e.id} className={styles.logItem}>
                <div className={styles.logStatus}>{bn ? (LABELS[e.toStatus]?.bn ?? e.toStatus) : (LABELS[e.toStatus]?.en ?? e.toStatus)}</div>
                <div className={styles.logMeta}>
                  {new Date(e.createdAt).toLocaleString(bn ? 'bn-BD' : 'en-GB')}
                  {e.note ? ` — ${e.note}` : ''}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}