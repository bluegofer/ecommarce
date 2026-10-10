'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { ApiError } from '@/lib/api/client';
import {
  PasswordInput,
  PasswordStrength,
  PhoneInput,
  OtpBoxes,
} from './index';
import { CountrySelector } from './CountrySelector';
import {
  getCountry,
  isValidNational,
  toE164,
  type Country,
} from '@ecommarce/types';
import styles from './RegisterForm.module.css';

export interface RegisterLabels {
  title: string;
  fullName: string;
  phone: string;
  emailOptional: string;
  password: string;
  confirmPassword: string;
  consent: string;
  submit: string;
  haveAccount: string;
  signin: string;
  otpTitle: string;
  otpSentTemplate: string;
  otpResend: string;
  otpResendNow: string;
  verify: string;
  back: string;
  strength: { weak: string; fair: string; strong: string };
  errors: {
    generic: string;
    invalidPhone: string;
    weakPassword: string;
    passwordMismatch: string;
    required: string;
    otpInvalid: string;
    consentRequired: string;
  };
}

export interface RegisterFormProps {
  locale: 'bn' | 'en';
  labels: RegisterLabels;
}

type Step = 'form' | 'otp';

export function RegisterForm({ locale, labels }: RegisterFormProps) {
  const { requestOtp, register } = useAuth();
  const [step, setStep] = useState<Step>('form');

  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState<Country>(() => getCountry('BD'));
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [consent, setConsent] = useState(false);

  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(60);

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);

  // Extract national (local) digits from E.164 using the selected country
  const nationalOf = (): string => {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith(country.dialCode)
      ? digits.slice(country.dialCode.length)
      : digits;
  };

  // Countdown while on OTP step
  useState(() => {
    if (step !== 'otp') return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  });

  const validateForm = (): boolean => {
    const e: typeof errors = {};
    if (!fullName.trim()) e.fullName = labels.errors.required;
    if (!phone.trim()) e.phone = labels.errors.required;
    else if (!isValidNational(country, nationalOf())) e.phone = labels.errors.invalidPhone;
    if (!password) e.password = labels.errors.required;
    else if (password.length < 8) e.password = labels.errors.weakPassword;
    if (confirm !== password) e.confirm = labels.errors.passwordMismatch;
    if (!consent) e.consent = labels.errors.consentRequired;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSendOtp = async (ev: FormEvent) => {
    ev.preventDefault();
    if (submitting) return;
    if (!validateForm()) return;
    setSubmitting(true);
    setErrors({});
    try {
      const e164 = toE164(country, nationalOf());
      const res = await requestOtp(e164);
      if (res.resendAfterSeconds) setResendIn(res.resendAfterSeconds);
      else setResendIn(60);
      setStep('otp');
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setErrors({ phone: labels.errors.invalidPhone });
      } else {
        setErrors({ form: labels.errors.generic });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onVerify = async (ev: FormEvent) => {
    ev.preventDefault();
    if (submitting) return;
    if (otp.length !== 6) {
      setErrors({ otp: labels.errors.otpInvalid });
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      const e164 = toE164(country, nationalOf());
      await register({
        fullName: fullName.trim(),
        phone: e164,
        email: email.trim() || undefined,
        password,
        otp,
      });
      window.location.href = `/${locale}/account`;
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setErrors({ otp: labels.errors.otpInvalid });
      } else {
        setErrors({ form: labels.errors.generic });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (resendIn > 0 || submitting) return;
    setSubmitting(true);
    try {
      const e164 = toE164(country, nationalOf());
      const res = await requestOtp(e164);
      setResendIn(res.resendAfterSeconds ?? 60);
      setOtp('');
      setErrors({});
    } catch {
      setErrors({ form: labels.errors.generic });
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'otp') {
    return (
      <form className={styles.card} onSubmit={onVerify} noValidate>
        <h1 className={styles.title}>{labels.otpTitle}</h1>
        <p className={styles.otpSent}>
          {labels.otpSentTemplate.replace('{phone}', phone)}
        </p>

        {errors.form ? (
          <div className={styles.formError} role="alert">{errors.form}</div>
        ) : null}

        <OtpBoxes
          value={otp}
          onChange={setOtp}
          error={errors.otp}
          label={labels.otpTitle}
          disabled={submitting}
        />

        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? <span className={styles.spinner} aria-hidden="true" /> : null}
          <span>{labels.verify}</span>
        </button>

        <div className={styles.resendRow}>
          {resendIn > 0 ? (
            <span className={styles.muted}>
              {labels.otpResend.replace('{s}', String(resendIn))}
            </span>
          ) : (
            <button type="button" className={styles.linkBtn} onClick={onResend}>
              {labels.otpResendNow}
            </button>
          )}
        </div>

        <button
          type="button"
          className={styles.backBtn}
          onClick={() => { setStep('form'); setOtp(''); setErrors({}); }}
        >
          ← {labels.back}
        </button>
      </form>
    );
  }

  return (
    <form className={styles.card} onSubmit={onSendOtp} noValidate>
      <h1 className={styles.title}>{labels.title}</h1>

      {errors.form ? (
        <div className={styles.formError} role="alert">{errors.form}</div>
      ) : null}

      <div className={styles.field}>
        <label htmlFor="reg-name" className={styles.label}>
          {labels.fullName} <span aria-hidden="true">*</span>
        </label>
        <input
          id="reg-name"
          type="text"
          className={[styles.input, errors.fullName ? styles.inputError : ''].filter(Boolean).join(' ')}
          value={fullName}
          onChange={(e) => { setFullName(e.target.value); if (errors.fullName) setErrors((p) => ({ ...p, fullName: undefined })); }}
          autoComplete="name"
          required
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? 'reg-name-error' : undefined}
        />
        {errors.fullName ? (
          <span id="reg-name-error" className={styles.error} role="alert">{errors.fullName}</span>
        ) : null}
      </div>

      <CountrySelector
        id="reg-country"
        locale={locale}
        value={country}
        onChange={(c) => {
          setCountry(c);
          setPhone('');
          if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
        }}
        label={locale === 'bn' ? 'দেশ' : 'Country'}
        required
      />

      <PhoneInput
        id="reg-phone"
        label={labels.phone}
        value={phone}
        country={country}
        onChange={(v) => { setPhone(v); if (errors.phone) setErrors((p) => ({ ...p, phone: undefined })); }}
        error={errors.phone}
        required
        autoComplete="tel"
      />

      <div className={styles.field}>
        <label htmlFor="reg-email" className={styles.label}>{labels.emailOptional}</label>
        <input
          id="reg-email"
          type="email"
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>

      <PasswordInput
        id="reg-password"
        label={labels.password}
        value={password}
        onChange={(v) => { setPassword(v); if (errors.password) setErrors((p) => ({ ...p, password: undefined })); }}
        error={errors.password}
        required
        autoComplete="new-password"
      />
      <PasswordStrength password={password} labels={labels.strength} />

      <PasswordInput
        id="reg-confirm"
        label={labels.confirmPassword}
        value={confirm}
        onChange={(v) => { setConfirm(v); if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined })); }}
        error={errors.confirm}
        required
        autoComplete="new-password"
      />

      <label className={styles.consentRow}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => { setConsent(e.target.checked); if (errors.consent) setErrors((p) => ({ ...p, consent: undefined })); }}
          aria-invalid={Boolean(errors.consent)}
        />
        <span>{labels.consent}</span>
      </label>
      {errors.consent ? (
        <span className={styles.error} role="alert">{errors.consent}</span>
      ) : null}

      <button type="submit" className={styles.submit} disabled={submitting}>
        {submitting ? <span className={styles.spinner} aria-hidden="true" /> : null}
        <span>{labels.submit}</span>
      </button>

      <div className={styles.footerRow}>
        <span className={styles.muted}>{labels.haveAccount}</span>{' '}
        <Link href={`/${locale}/signin`} className={styles.link}>{labels.signin}</Link>
      </div>
    </form>
  );
}