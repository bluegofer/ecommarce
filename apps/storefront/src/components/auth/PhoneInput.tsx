'use client';

import styles from './PhoneInput.module.css';

export interface PhoneInputProps {
  id: string;
  label: string;
  /**
   * Full phone stored as E.164-style "+8801XXXXXXXXX" (13 chars incl +),
   * OR the raw 10-digit national part (e.g. "1715141764").
   * The component normalizes to "+8801XXXXXXXXX" via onChange.
   */
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  autoComplete?: 'tel';
  required?: boolean;
  disabled?: boolean;
}

/** Extract the 10-digit national part (drop +880 / 880 / 0 / +88). */
function toNational10(full: string): string {
  const digits = full.replace(/\D/g, '');
  let s = digits;
  if (s.startsWith('880')) s = s.slice(3);
  else if (s.startsWith('88')) s = s.slice(2);
  if (s.startsWith('0')) s = s.slice(1);
  return s.slice(0, 10);
}

/** Format for API/storage: +880 + 10-digit national. */
export function toE164(national10: string): string {
  const n = national10.replace(/\D/g, '').slice(0, 10);
  return n ? `+880${n}` : '';
}

/** BD mobile: 10-digit national, starts with 1, second digit 3-9. */
export function isValidBdPhone(full: string): boolean {
  const nat = toNational10(full);
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
}: PhoneInputProps) {
  const national = toNational10(value);
  const errId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errId, hintId].filter(Boolean).join(' ') || undefined;

  const handle = (raw: string) => {
    // Strip everything except digits, take max 10 national digits
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    onChange(toE164(digits));
  };

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <div className={[styles.wrap, error ? styles.wrapError : ''].filter(Boolean).join(' ')}>
        <span className={styles.prefix} aria-hidden="true">+880</span>
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
          maxLength={10}
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