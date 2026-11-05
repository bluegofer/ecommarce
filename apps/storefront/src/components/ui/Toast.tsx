'use client';

import { useToast } from '@/lib/ui/toast-context';
import styles from './Toast.module.css';

/**
 * Renders all currently queued toasts.
 * Mount <ToastViewport /> once, near the root of the app.
 */
export function ToastViewport() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className={styles.viewport}
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <div key={t.id} className={styles.toast} role="status">
          <span className={[styles.icon, styles[`kind_${t.kind ?? 'success'}`]].join(' ')} aria-hidden="true">
            {t.kind === 'error' ? <ErrorIcon /> : t.kind === 'info' ? <InfoIcon /> : <CheckIcon />}
          </span>

          {t.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.thumb} src={t.thumbnailUrl} alt="" width={48} height={48} />
          ) : null}

          <div className={styles.body}>
            <div className={styles.title}>{t.title}</div>
            {t.description ? <div className={styles.desc}>{t.description}</div> : null}
            {t.action ? (
              <button type="button" className={styles.action} onClick={() => { t.action!.onClick(); dismiss(t.id); }}>
                {t.action.label}
              </button>
            ) : null}
          </div>

          <button
            type="button"
            className={styles.close}
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss notification"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {t.durationMs !== 0 ? (
            <span className={styles.progress} aria-hidden="true" style={{ animationDuration: `${t.durationMs ?? 5000}ms` }} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M8 12.5l2.5 2.5L16 9.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ErrorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M12 7v6M12 16.5v.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M12 11v6M12 7.5v.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}