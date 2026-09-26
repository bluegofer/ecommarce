'use client';

import styles from './PasswordStrength.module.css';

export interface PasswordStrengthLabels {
  weak: string;
  fair: string;
  strong: string;
}

export interface PasswordStrengthProps {
  password: string;
  labels: PasswordStrengthLabels;
}

type Level = 'weak' | 'fair' | 'strong';

/**
 * Very simple heuristic: length + character class diversity.
 * Not a security control — just a UI hint per UI Spec C7.
 */
function evaluate(password: string): { level: Level | null; score: 0 | 1 | 2 | 3 } {
  if (!password) return { level: null, score: 0 };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { level: 'weak', score: 1 };
  if (score <= 3) return { level: 'fair', score: 2 };
  return { level: 'strong', score: 3 };
}

export function PasswordStrength({ password, labels }: PasswordStrengthProps) {
  const { level, score } = evaluate(password);
  if (!level) return null;

  const label = labels[level];
  return (
    <div className={styles.wrap} aria-live="polite">
      <div className={styles.bars} role="presentation">
        <span className={[styles.bar, score >= 1 ? styles[level] : ''].filter(Boolean).join(' ')} />
        <span className={[styles.bar, score >= 2 ? styles[level] : ''].filter(Boolean).join(' ')} />
        <span className={[styles.bar, score >= 3 ? styles[level] : ''].filter(Boolean).join(' ')} />
      </div>
      <span className={[styles.label, styles[`label_${level}`]].join(' ')}>
        {label}
      </span>
    </div>
  );
}