'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { ApiError } from '@/lib/api/client';
import { PasswordInput, PhoneInput, isValidBdPhone } from './index';
import styles from './SignInForm.module.css';

export interface SignInLabels {
  title: string;
  phone: string;
  password: string;
  submit: string;
  forgot: string;
  newCustomer: string;
  signup: string;
  errors: {
    generic: string;
    invalidCredentials: string;
    invalidPhone: string;
    required: string;
  };
}

export interface SignInFormProps {
  locale: 'bn' | 'en';
  labels: SignInLabels;
  /** Redirect target after successful sign-in (?next= param). */
  next?: string;
}

export function SignInForm({ locale, labels, next }: SignInFormProps) {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ phone?: string; password?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!phone.trim()) next.phone = labels.errors.required;
    else if (!isValidBdPhone(phone)) next.phone = labels.errors.invalidPhone;
    if (!password) next.password = labels.errors.required;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    setErrors({});
    try {
      await login({ phone: phone.trim(), password });
      const dest = next && next.startsWith('/') ? next : `/${locale}/account`;
      window.location.href = dest;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setErrors({ form: labels.errors.invalidCredentials });
      } else {
        setErrors({ form: labels.errors.generic });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.card} onSubmit={onSubmit} noValidate>
      <h1 className={styles.title}>{labels.title}</h1>

      {errors.form ? (
        <div className={styles.formError} role="alert">{errors.form}</div>
      ) : null}

      <PhoneInput
        id="signin-phone"
        label={labels.phone}
        value={phone}
        onChange={(v) => { setPhone(v); if (errors.phone) setErrors((p) => ({ ...p, phone: undefined })); }}
        error={errors.phone}
        required
        autoComplete="tel"
      />

      <PasswordInput
        id="signin-password"
        label={labels.password}
        value={password}
        onChange={(v) => { setPassword(v); if (errors.password) setErrors((p) => ({ ...p, password: undefined })); }}
        error={errors.password}
        required
        autoComplete="current-password"
      />

      <div className={styles.forgotRow}>
        <Link href={`/${locale}/forgot-password`} className={styles.link}>
          {labels.forgot}
        </Link>
      </div>

      <button type="submit" className={styles.submit} disabled={submitting}>
        {submitting ? <span className={styles.spinner} aria-hidden="true" /> : null}
        <span>{labels.submit}</span>
      </button>

      <div className={styles.divider} aria-hidden="true">—</div>

      <div className={styles.footerRow}>
        <span className={styles.muted}>{labels.newCustomer}</span>{' '}
        <Link href={`/${locale}/register`} className={styles.link}>
          {labels.signup}
        </Link>
      </div>
    </form>
  );
}