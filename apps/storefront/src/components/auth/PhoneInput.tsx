'use client';

import styles from './PhoneInput.module.css';

export interface PhoneInputProps {
  id: string;
  label: string;
  /** Full phone including +880 prefix, or just national digits (11 chars starting with 1). */
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  autoComplete?: 'tel';
  required?: boolean;
  disabled?: boolean;
  /** Locale-aware help text under the input. */
  prefix?: string; // default '+88'
}

/** Extract the national part (e.g. "01715141764" → "1715141764"). */
function toNational(full: string): string {
  const digits = full.replace(/\D/g, '');
  if (digits.startsWith('880')) return digits.slice(3);
  if (digits.startsWith('88')) return digits.slice(2);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
}

/** BD mobile: 11 digits, starts with 1, second digit 3-9. */
export function isValidBdPhone(full: string): boolean {
  const nat = toNational(full);
  return /^1[3-9]\d{8}$/.test(nat);
}

export function PhoneInput({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  autoComplete = 'tel',
  required = false,
  disabled = false,
  prefix = '+88',
}: PhoneInputProps) {
  const national = toNational(value);
  const errId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errId, hintId].filter(Boolean).join(' ') || undefined;

  const handle = (raw: string) => {
    // Keep only digits, prefix 0 if user typed a 10-digit starting with 1-9
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) {
      onChange('');
      return;
    }
    // Auto-normalize to 0XXXXXXXXXX form
    const withLeadingZero = digits.startsWith('0') ? digits : `0${digits}`.slice(0, 11);
    onChange(withLeadingZero);
  };

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <div className={[styles.wrap, error ? styles.wrapError : ''].filter(Boolean).join(' ')}>
        <span className={styles.prefix} aria-hidden="true">{prefix}</span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          className={styles.input}
          value={national}
          onChange={(e) => handle(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          maxLength={11}
          placeholder="1XXXXXXXXX"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
      </div>
      {error ? (
        <span id={errId} className={styles.error} role="alert">{error}</span>
      ) : null}
      {hint ? <span id={hintId} className={styles.hint}>{hint}</span> : null}
    </div>
  );
}