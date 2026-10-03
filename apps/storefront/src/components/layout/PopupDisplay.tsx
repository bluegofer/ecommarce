'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cmsApi, type ActivePopup } from '@/lib/api/cms';
import styles from './PopupDisplay.module.css';

interface PopupDisplayProps {
  locale: 'bn' | 'en';
  delayMs?: number;
  dismissHours?: number;
}

const DISMISS_STORAGE_PREFIX = 'bluegofer-popup-dismissed:';

function XIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function isDismissed(id: string, dismissHours: number): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(`${DISMISS_STORAGE_PREFIX}${id}`);
    if (!raw) return false;
    const timestamp = Number(raw);
    if (!Number.isFinite(timestamp)) return false;
    const ageMs = Date.now() - timestamp;
    return ageMs < dismissHours * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function markDismissed(id: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${DISMISS_STORAGE_PREFIX}${id}`,
      String(Date.now()),
    );
  } catch {
    // ignore quota / privacy mode
  }
}

export function PopupDisplay({
  locale,
  delayMs = 1500,
  dismissHours = 24,
}: PopupDisplayProps) {
  const [popup, setPopup] = useState<ActivePopup | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const list = await cmsApi.getActivePopups();
        if (cancelled) return;
        const candidate = list.find(
          (p) => p.isActive && !isDismissed(p.id, dismissHours),
        );
        if (candidate) {
          setPopup(candidate);
          setOpen(true);
        }
      } catch {
        // silent fail — popup is non-critical
      }
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [delayMs, dismissHours]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (popup) markDismissed(popup.id);
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, popup]);

  function close() {
    if (popup) markDismissed(popup.id);
    setOpen(false);
  }

  if (!open || !popup) return null;

  const title = locale === 'bn' ? popup.titleBn : popup.titleEn;
  const body = locale === 'bn' ? popup.bodyBn : popup.bodyEn;
  const ctaLabel = locale === 'bn' ? popup.ctaLabelBn : popup.ctaLabelEn;

  return (
    <div className={styles.wrap} role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close popup"
        onClick={close}
        className={styles.scrim}
      />

      <div className={styles.card}>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className={styles.close}
        >
          <XIcon />
        </button>

        {popup.imageUrl ? (
          <img src={popup.imageUrl} alt={title} className={styles.image} />
        ) : null}

        <div className={styles.body}>
          <h3 className={styles.title}>{title}</h3>
          {body ? <p className={styles.text}>{body}</p> : null}

          {popup.ctaUrl && ctaLabel ? (
            <Link href={popup.ctaUrl} onClick={close} className={styles.cta}>
              {ctaLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}