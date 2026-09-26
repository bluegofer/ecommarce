'use client';

import { useState } from 'react';
import styles from './PasswordInput.module.css';

export interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Optional error message shown below input. */
  error?: string;
  /** Optional helper text below input. */
  hint?: string;
  autoComplete?: 'current-password' | 'new-password';
  required?: boolean;
  /** Visibility toggle aria labels (locale-resolved by caller). */
  showLabel?: string;
  hideLabel?: string;
  disabled?: boolean;
}

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  autoComplete = 'current-password',
  required = false,
  showLabel = 'Show password',
  hideLabel = 'Hide password',
  disabled = false,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const errId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <div className={[styles.wrap, error ? styles.wrapError : ''].filter(Boolean).join(' ')}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className={styles.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          disabled={disabled}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error ? (
        <span id={errId} className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
      {hint ? <span id={hintId} className={styles.hint}>{hint}</span> : null}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10.6 6.1A10.4 10.4 0 0112 6c6.5 0 10 6 10 6a17 17 0 01-2.9 3.4M6.7 6.7C3.6 8.7 2 12 2 12s3.5 6 10 6c1.8 0 3.4-.5 4.8-1.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}