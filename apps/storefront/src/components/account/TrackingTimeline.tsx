import type { MyOrderStatusEvent } from '@/lib/api';
import styles from './TrackingTimeline.module.css';

export interface TimelineNodeLabels {
  PLACED: string;
  PENDING_VERIFICATION: string;
  VERIFIED: string;
  CONFIRMED: string;
  PROCESSING: string;
  SHIPPED: string;
  IN_TRANSIT: string;
  OUT_FOR_DELIVERY: string;
  DELIVERED: string;
}

export interface TrackingTimelineLabels {
  nodes: TimelineNodeLabels;
  notePrefix: string;
}

export interface TrackingTimelineProps {
  locale: 'bn' | 'en';
  currentStatus: string;
  events: MyOrderStatusEvent[];
  labels: TrackingTimelineLabels;
  /** ISO date string for ETA (when status is not DELIVERED yet). */
  eta?: string | null;
}

const FLOW = ['PLACED', 'PENDING_VERIFICATION', 'VERIFIED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;

/** Map API status (which may skip some steps) to the latest flow index reached. */
function reachedIndex(status: string): number {
  const idx = FLOW.indexOf(status as (typeof FLOW)[number]);
  return idx === -1 ? 0 : idx;
}

export function TrackingTimeline({
  locale,
  currentStatus,
  events,
  labels,
  eta,
}: TrackingTimelineProps) {
  const reached = reachedIndex(currentStatus);
  const isCancelled = currentStatus === 'CANCELLED' || currentStatus === 'RETURNED';

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  // Find the last event for each status in FLOW
  const eventForStatus = (status: string) =>
    [...events].reverse().find((e) => e.toStatus === status);

  return (
    <ol className={styles.timeline}>
      {FLOW.map((status, i) => {
        const done = i < reached || (i === reached && !isCancelled);
        const current = i === reached && !isCancelled;
        const upcoming = i > reached;
        const ev = eventForStatus(status);
        const label = labels.nodes[status];

        return (
          <li
            key={status}
            className={[
              styles.node,
              done ? styles.done : '',
              current ? styles.current : '',
              upcoming ? styles.upcoming : '',
            ].filter(Boolean).join(' ')}
          >
            <span className={styles.marker} aria-hidden="true">
              {done && !current ? <CheckIcon /> : current ? <PulseDot /> : null}
            </span>
            <div className={styles.body}>
              <span className={styles.label}>{label}</span>
              {ev ? (
                <span className={styles.meta}>
                  {fmtDate(ev.createdAt)}
                  {ev.note ? ` · ${labels.notePrefix} ${ev.note}` : ''}
                </span>
              ) : upcoming && status === 'DELIVERED' && eta ? (
                <span className={styles.meta}>
                  {new Date(eta).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PulseDot() {
  return <span className={styles.pulseDot} />;
}