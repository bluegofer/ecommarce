'use client';

import { useState } from 'react';
import styles from './NewsletterSignup.module.css';

interface Props {
  locale: 'bn' | 'en';
}

export function NewsletterSignup({ locale }: Props) {
  const bn = locale === 'bn';
  const t = (en: string, b: string) => (bn ? b : en);

  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t('Please enter a valid email address', 'সঠিক ইমেইল ঠিকানা দিন'));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/v1/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'footer', locale }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? `Error ${res.status}`);
      }
      setDone(true);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscribe failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.strip} aria-label={t('Newsletter', 'নিউজলেটার')}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <div className={styles.iconWrap} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <polyline points="3 7 12 13 21 7" />
            </svg>
          </div>
          <div>
            <h3 className={styles.title}>{t('Subscribe to our newsletter', 'আমাদের নিউজলেটার সাবস্ক্রাইব করুন')}</h3>
            <p className={styles.sub}>{t('Get the latest info on events, sales, and offers.', 'ইভেন্ট, সেল এবং অফার সম্পর্কে সর্বশেষ তথ্য পান।')}</p>
          </div>
        </div>

        {done ? (
          <p className={styles.thanks}>
            {t('Thank you for subscribing!', 'সাবস্ক্রাইব করার জন্য ধন্যবাদ!')}
          </p>
        ) : (
          <form onSubmit={submit} className={styles.form}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('Enter your email', 'আপনার ইমেইল দিন')}
              className={styles.input}
              disabled={busy}
              aria-label={t('Email address', 'ইমেইল ঠিকানা')}
            />
            <button type="submit" disabled={busy} className={styles.btn}>
              {busy ? t('Subscribing…', 'সাবস্ক্রাইব হচ্ছে…') : t('Subscribe', 'সাবস্ক্রাইব')}
            </button>
          </form>
        )}

        {error && <p className={styles.err}>{error}</p>}
      </div>
    </section>
  );
}