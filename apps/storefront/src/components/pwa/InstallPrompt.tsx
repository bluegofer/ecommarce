'use client';

import { useEffect, useState } from 'react';
import styles from './InstallPrompt.module.css';

export interface InstallPromptLabels {
  title: string;
  body: string;
  install: string;
  dismiss: string;
}

export interface InstallPromptProps {
  labels: InstallPromptLabels;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'skymart:pwa-install-dismissed';
const DISMISS_DAYS = 14;

export function InstallPrompt({ labels }: InstallPromptProps) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Respect previous dismissal
    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) ?? '0');
    if (dismissedAt) {
      const days = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      if (days < DISMISS_DAYS) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible || !deferred) return null;

  const onInstall = async () => {
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        setVisible(false);
        setDeferred(null);
      }
    } catch {
      /* noop */
    }
  };

  const onDismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <div className={styles.wrap} role="dialog" aria-live="polite">
      <div className={styles.body}>
        <span className={styles.icon} aria-hidden="true">📱</span>
        <div className={styles.text}>
          <span className={styles.title}>{labels.title}</span>
          <span className={styles.subtitle}>{labels.body}</span>
        </div>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.installBtn} onClick={onInstall}>
          {labels.install}
        </button>
        <button
          type="button"
          className={styles.dismissBtn}
          onClick={onDismiss}
          aria-label={labels.dismiss}
        >
          ✕
        </button>
      </div>
    </div>
  );
}