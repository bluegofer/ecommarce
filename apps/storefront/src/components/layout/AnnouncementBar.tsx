'use client';

import { useEffect, useState } from 'react';
import styles from './AnnouncementBar.module.css';

const DISMISS_STORAGE_KEY = 'sk.announcement.dismissed';
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours per UI Spec B1

export interface AnnouncementBarProps {
  /** Content (plain text or short HTML). */
  message: string;
  /** Optional CTA link + label. */
  ctaLabel?: string;
  ctaHref?: string;
  /** Locale for dismiss aria-label. */
  locale?: 'bn' | 'en';
}

/**
 * Announcement bar (UI Spec B1 row 0).
 * Sky-950 bg, H32, 13px #DCF0FA, centered, dismissible (X) — hidden 24h after dismiss.
 */
export function AnnouncementBar({
  message,
  ctaLabel,
  ctaHref,
  locale = 'en',
}: AnnouncementBarProps) {
  const [visible, setVisible] = useState<boolean | null>(null); // null = not yet resolved (SSR-safe)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY);
      if (!raw) {
        setVisible(true);
        return;
      }
      const ts = Number(raw);
      if (!Number.isFinite(ts) || Date.now() - ts > DISMISS_TTL_MS) {
        window.localStorage.removeItem(DISMISS_STORAGE_KEY);
        setVisible(true);
      } else {
        setVisible(false);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    } catch {
      /* noop */
    }
    setVisible(false);
  };

  if (!visible) return null;

  const dismissLabel = locale === 'bn' ? 'বন্ধ করুন' : 'Dismiss';

  return (
    <div className={styles.bar} role="region" aria-label={locale === 'bn' ? 'ঘোষণা' : 'Announcement'}>
      <div className={styles.inner}>
        <span className={styles.message}>{message}</span>
        {ctaLabel && ctaHref ? (
          <a className={styles.cta} href={ctaHref}>{ctaLabel}</a>
        ) : null}
      </div>
      <button
        type="button"
        className={styles.close}
        onClick={handleDismiss}
        aria-label={dismissLabel}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}