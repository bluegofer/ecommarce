'use client';

import type { Country } from '@ecommarce/types';
import { getCountry, isValidNational, toE164 } from '@ecommarce/types';
import styles from './PhoneInput.module.css';

export interface PhoneInputProps {
  id: string;
  label: string;
  /**
   * The full E.164 phone stored (`+8801712345678`).
   * Component parses into the country's national part for display.
   * On change emits E.164 for the currently selected country.
   */
  value: string;
  onChange: (v: string) => void;
  /**
   * The country selected in the sibling CountrySelector.
   * Optional — defaults to BD (for login-only flows where country
   * selection is not exposed to the user).
   */
  country?: Country;
  error?: string;
  hint?: string;
  autoComplete?: 'tel';
  required?: boolean;
  disabled?: boolean;
}

/**
 * Extract the national part from an E.164 value using the country's dial
 * code. Returns digits only, without leading '0'.
 */
function toNational(e164: string, country: Country): string {
  const digits = (e164 || '').replace(/\D/g, '');
  if (digits.startsWith(country.dialCode)) {
    return digits.slice(country.dialCode.length).slice(0, country.nationalMaxLength);
  }
  return digits.slice(0, country.nationalMaxLength);
}

/**
 * Re-export for backwards compatibility. Uses default (BD) rules.
 * New code should use `isValidNational(country, national)` from
 * `@ecommarce/types`.
 */
export function toE164Legacy(national: string): string {
  const digits = national.replace(/\D/g, '').slice(0, 10);
  return digits ? `+880${digits}` : '';
}

/** Backwards-compatible BD phone check. */
export function isValidBdPhone(full: string): boolean {
  const digits = (full || '').replace(/\D/g, '');
  const nat = digits.startsWith('880') ? digits.slice(3) : digits;
  return /^1[3-9]\d{8}$/.test(nat);
}

/** Backwards-compatible E.164 composer (BD only). */
export function toE164Bd(national: string): string {
  const n = national.replace(/\D/g, '').slice(0, 10);
  return n ? `+880${n}` : '';
}

export function PhoneInput({
  id,
  label,
  value,
  onChange,
  country: countryProp,
  error,
  hint,
  autoComplete = 'tel',
  required = false,
  disabled = false,
}: PhoneInputProps) {
  // Default to BD when no country prop provided (login-only flows).
  const country: Country = countryProp ?? getCountry('BD');
  const national = toNational(value, country);
  const errId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errId, hintId].filter(Boolean).join(' ') || undefined;

  const handle = (raw: string) => {
    // Strip everything except digits, cap at country's max length
    const digits = raw.replace(/\D/g, '').slice(0, country.nationalMaxLength);
    onChange(toE164(country, digits));
  };

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <div className={[styles.wrap, error ? styles.wrapError : ''].filter(Boolean).join(' ')}>
        <span className={styles.prefix} aria-hidden="true">+{country.dialCode}</span>
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
          maxLength={country.nationalMaxLength}
          placeholder={country.exampleLocal}
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

// Re-export type for consumers that need to check validity
export { isValidNational, toE164 };