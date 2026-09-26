'use client';

import { useEffect, useRef, useState } from 'react';
import { COUNTRIES, type Country } from '@ecommarce/types';
import styles from './CountrySelector.module.css';

export interface CountrySelectorProps {
  id: string;
  /** Locale for name display. */
  locale: 'bn' | 'en';
  /** Currently selected country. */
  value: Country;
  /** Callback with the newly selected country. */
  onChange: (c: Country) => void;
  /** Error message below field. */
  error?: string;
  /** Hint message below field. */
  hint?: string;
  /** Label text (localized). */
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Country picker with flag, name, and dial code.
 * Searchable by English or Bengali name, or by dial code.
 * Defaults to BD when opened (the parent controls the current value).
 */
export function CountrySelector({
  id,
  locale,
  value,
  onChange,
  error,
  hint,
  label,
  required = false,
  disabled = false,
}: CountrySelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? COUNTRIES.filter(
        (c) =>
          c.nameEn.toLowerCase().includes(q) ||
          c.nameBn.includes(query.trim()) ||
          c.dialCode.includes(q) ||
          c.code.toLowerCase().includes(q),
      )
    : COUNTRIES;

  const errId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {label ? (
        <label htmlFor={id} className={styles.label}>
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </label>
      ) : null}

      <button
        id={id}
        type="button"
        className={[styles.trigger, error ? styles.triggerError : ''].filter(Boolean).join(' ')}
        onClick={() => {
          if (disabled) return;
          setOpen((o) => !o);
          setQuery('');
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
      >
        <span className={styles.flag} aria-hidden="true">{value.flag}</span>
        <span className={styles.name}>
          {locale === 'bn' ? value.nameBn : value.nameEn}
        </span>
        <span className={styles.dial}>+{value.dialCode}</span>
        <svg
          className={styles.chevron}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <polyline
            points="6 9 12 15 18 9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div className={styles.list} role="listbox">
          <div className={styles.searchWrap}>
            <input
              type="text"
              className={styles.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={locale === 'bn' ? 'খুঁজুন…' : 'Search…'}
              autoFocus
              aria-label={locale === 'bn' ? 'দেশ খুঁজুন' : 'Search country'}
            />
          </div>

          {filtered.length === 0 ? (
            <div className={styles.noResults}>
              {locale === 'bn' ? 'কোনো দেশ পাওয়া যায়নি' : 'No country found'}
            </div>
          ) : (
            filtered.map((c) => {
              const isActive = c.code === value.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={[styles.item, isActive ? styles.itemActive : ''].filter(Boolean).join(' ')}
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <span className={styles.flag} aria-hidden="true">{c.flag}</span>
                  <span>{locale === 'bn' ? c.nameBn : c.nameEn}</span>
                  <span className={styles.itemDial}>+{c.dialCode}</span>
                </button>
              );
            })
          )}
        </div>
      ) : null}

      {error ? (
        <span id={errId} className={styles.error} role="alert">{error}</span>
      ) : null}
      {hint ? <span id={hintId} className={styles.hint}>{hint}</span> : null}
    </div>
  );
}