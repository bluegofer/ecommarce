'use client';

import { useEffect, useRef } from 'react';
import styles from './OtpBoxes.module.css';

export interface OtpBoxesProps {
  /** Current value (up to 6 digits). */
  value: string;
  onChange: (v: string) => void;
  /** Fires when all 6 digits are filled. */
  onComplete?: (code: string) => void;
  /** Error message (rendered below). */
  error?: string;
  /** Accessible label for the group. */
  label?: string;
  disabled?: boolean;
  /** Number of boxes (default 6). */
  length?: number;
}

export function OtpBoxes({
  value,
  onChange,
  onComplete,
  error,
  label = 'One-time code',
  disabled = false,
  length = 6,
}: OtpBoxesProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, ' ').slice(0, length).split('');
  const errId = error ? 'otp-error' : undefined;

  useEffect(() => {
    // Focus first empty box on mount
    const first = refs.current[0];
    if (first) first.focus();
  }, []);

  const setAt = (idx: number, ch: string) => {
    const next = digits.map((d, i) => (i === idx ? ch : d)).join('').trimEnd();
    onChange(next.replace(/\s/g, ''));
    if (ch && idx < length - 1) {
      refs.current[idx + 1]?.focus();
    }
    const complete = next.replace(/\s/g, '');
    if (complete.length === length && onComplete) {
      onComplete(complete);
    }
  };

  const handleInput = (idx: number, raw: string) => {
    const digitsOnly = raw.replace(/\D/g, '');
    if (!digitsOnly) {
      setAt(idx, '');
      return;
    }
    // If user pasted multiple digits, distribute them starting at idx.
    const chars = digitsOnly.split('');
    chars.forEach((c, offset) => {
      const target = idx + offset;
      if (target < length) setAt(target, c);
    });
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[idx] && digits[idx] !== ' ') {
        setAt(idx, '');
      } else if (idx > 0) {
        setAt(idx - 1, '');
        refs.current[idx - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      refs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < length - 1) {
      refs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    if (pasted.length === length && onComplete) {
      onComplete(pasted);
    }
    const lastIdx = Math.min(pasted.length, length - 1);
    refs.current[lastIdx]?.focus();
  };

  return (
    <div className={styles.wrap}>
      <div
        className={styles.boxes}
        role="group"
        aria-label={label}
        aria-invalid={Boolean(error)}
        aria-describedby={errId}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={d.trim()}
            onChange={(e) => handleInput(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={styles.box}
            aria-label={`Digit ${i + 1} of ${length}`}
          />
        ))}
      </div>
      {error ? (
        <span id={errId} className={styles.error} role="alert">{error}</span>
      ) : null}
    </div>
  );
}