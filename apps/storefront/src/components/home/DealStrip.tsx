'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './DealStrip.module.css';

export interface DealStripProps {
  /** Server-provided end time (ISO string). Client computes countdown. */
  endsAtIso: string;
  label: string;
  ctaLabel: string;
  ctaHref: string;
  locale: 'bn' | 'en';
}

/** Format remaining ms as "07 : 42 : 18" per UI Spec C1. */
function formatRemaining(ms: number): string {
  if (ms <= 0) return '00 : 00 : 00';
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h} : ${m} : ${s}`;
}

export function DealStrip({ endsAtIso, label, ctaLabel, ctaHref, locale }: DealStripProps) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(endsAtIso).getTime() - Date.now()),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, new Date(endsAtIso).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [endsAtIso]);

  return (
    <div className={styles.strip} role="status" aria-live="polite">
      <span className={styles.icon} aria-hidden="true">⚡</span>
      <span className={styles.label}>{label}</span>
      <span className={styles.timer + ' sk-tabular'}>{formatRemaining(remaining)}</span>
      <Link href={ctaHref} className={styles.cta}>{ctaLabel}</Link>
    </div>
  );
}