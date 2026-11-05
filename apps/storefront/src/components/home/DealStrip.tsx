'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './DealStrip.module.css';

export interface DealStripProps {
  endsAtIso: string;
  label: string;
  ctaLabel: string;
  ctaHref: string;
  locale: 'bn' | 'en';
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '00 : 00 : 00';
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h} : ${m} : ${s}`;
}

export function DealStrip({ endsAtIso, label, ctaLabel, ctaHref, locale }: DealStripProps) {
  // Start null so server + first client render agree (placeholder); countdown
  // fills in after hydration. Avoids "text content does not match" hydration errors.
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      setRemaining(Math.max(0, new Date(endsAtIso).getTime() - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAtIso]);

  const display = remaining === null ? '-- : -- : --' : formatRemaining(remaining);

  return (
    <div className={styles.strip} role="status" aria-live="polite">
      <span className={styles.icon} aria-hidden="true">⚡</span>
      <span className={styles.label}>{label}</span>
      <span className={styles.timer + ' sk-tabular'} suppressHydrationWarning>{display}</span>
      <Link href={ctaHref} className={styles.cta}>{ctaLabel}</Link>
    </div>
  );
}