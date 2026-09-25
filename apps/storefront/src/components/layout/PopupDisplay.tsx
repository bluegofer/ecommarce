'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cmsApi, type ActivePopup } from '@/lib/api/cms';

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
        const candidate = list.find((p) => p.isActive && !isDismissed(p.id, dismissHours));
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

  function close() {
    if (popup) markDismissed(popup.id);
    setOpen(false);
  }

  if (!open || !popup) return null;

  const title = locale === 'bn' ? popup.titleBn : popup.titleEn;
  const body = locale === 'bn' ? popup.bodyBn : popup.bodyEn;
  const ctaLabel = locale === 'bn' ? popup.ctaLabelBn : popup.ctaLabelEn;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close popup"
        onClick={close}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
      />

      <div className="relative w-full max-w-[440px] bg-white rounded-lg shadow-2xl overflow-hidden">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-2 right-2 z-10 h-8 w-8 grid place-items-center rounded-full bg-white/90 hover:bg-slate-100 transition-colors text-slate-600"
        >
          <XIcon />
        </button>

        {popup.imageUrl ? (
          <img
            src={popup.imageUrl}
            alt={title}
            className="w-full aspect-[2/1] object-cover bg-slate-100"
          />
        ) : null}

        <div className="p-5">
          <h3 className="text-[18px] font-bold text-slate-900 leading-tight">
            {title}
          </h3>
          {body ? (
            <p className="text-[13.5px] text-slate-600 mt-2 whitespace-pre-wrap">
              {body}
            </p>
          ) : null}

          {popup.ctaUrl && ctaLabel ? (
            <Link
              href={popup.ctaUrl}
              onClick={close}
              className="mt-4 inline-flex items-center justify-center w-full h-10 rounded bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors"
            >
              {ctaLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}