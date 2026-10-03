'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { accountApi, ApiError, type MeProfile } from '@/lib/api';
import { PasswordInput, PhoneInput, OtpBoxes } from '@/components/auth';
import { CountrySelector } from '@/components/auth/CountrySelector';
import {
  getCountry,
  isValidNational,
  toE164,
  type Country,
} from '@ecommarce/types';
import styles from './ProfileSettings.module.css';

export interface ProfileSettingsLabels {
  title: string;
  sectionProfile: string;
  fullName: string;
  email: string;
  phone: string;
  phoneVerified: string;
  phoneNotVerified: string;
  phoneChangeBtn: string;
  phoneVerifyBtn: string;
  phoneCancelBtn: string;
  phoneCurrentLabel: string;
  phoneNewLabel: string;
  phoneSendOtp: string;
  phoneOtpLabel: string;
  phoneVerifyAction: string;
  phoneChangeSuccess: string;
  phoneVerifySuccess: string;
  countryLabel: string;
  save: string;
  saving: string;
  saved: string;
  sectionPassword: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  updatePassword: string;
  passwordNote: string;
  passwordGoogleNote?: string;
  loading: string;
  errorText: string;
  invalidEmail: string;
  weakPassword: string;
  passwordMismatch: string;
  wrongCurrentPassword: string;
  otpInvalid: string;
  otpSent: string;
  invalidPhone: string;
  samePhone: string;
  phoneTaken: string;
}

export interface ProfileSettingsProps {
  locale: 'bn' | 'en';
  labels: ProfileSettingsLabels;
}

type PhoneMode = 'idle' | 'change-form' | 'change-otp' | 'verify-otp';

export function ProfileSettings({ locale, labels }: ProfileSettingsProps) {
  const { user, requestOtp } = useAuth();
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile edit
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Phone change / verify flow
  const [phoneMode, setPhoneMode] = useState<PhoneMode>('idle');
  const [newCountry, setNewCountry] = useState<Country>(() => getCountry('BD'));
  const [newPhone, setNewPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneNotice, setPhoneNotice] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await accountApi.getProfile();
        if (cancelled) return;
        setProfile(p);
        setFullName(p.fullName);
        setEmail(p.email ?? '');
      } catch (err) {
        if (cancelled) return;
        if (!(err instanceof ApiError && err.status === 401)) {
          setError(labels.errorText);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [labels.errorText]);

  // Resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const onSaveProfile = async () => {
    if (saving) return;
    setSaveError(null);
    setSaved(false);
    setSaving(true);
    try {
      const updated = await accountApi.updateProfile({
        fullName: fullName.trim(),
        email: email.trim() || null,
      });
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(
        err instanceof ApiError && err.status === 400
          ? labels.invalidEmail
          : labels.errorText,
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Phone change/verify helpers ──

  const startChangePhone = () => {
    setPhoneMode('change-form');
    setNewPhone('');
    setPhoneOtp('');
    setPhoneError(null);
    setPhoneNotice(null);
    if (profile) {
      setNewCountry(getCountry('BD'));
    }
  };

  const cancelPhoneFlow = () => {
    setPhoneMode('idle');
    setNewPhone('');
    setPhoneOtp('');
    setPhoneError(null);
    setPhoneNotice(null);
  };

  const onSendChangeOtp = async () => {
    if (phoneBusy) return;
    setPhoneError(null);
    setPhoneNotice(null);

    const national = newPhone.replace(/\D/g, '').slice(newCountry.dialCode.length);
    if (!national || !isValidNational(newCountry, national)) {
      setPhoneError(labels.invalidPhone);
      return;
    }
    const e164 = toE164(newCountry, national);
    if (profile && e164 === profile.phone) {
      setPhoneError(labels.samePhone);
      return;
    }

    setPhoneBusy(true);
    try {
      await requestOtp(e164);
      setPhoneNotice(labels.otpSent);
      setResendIn(60);
      setPhoneMode('change-otp');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('already registered')) setPhoneError(labels.phoneTaken);
      else setPhoneError(labels.invalidPhone);
    } finally {
      setPhoneBusy(false);
    }
  };

  const onSendVerifyCurrentOtp = async () => {
    if (phoneBusy || !profile) return;
    setPhoneError(null);
    setPhoneNotice(null);
    setPhoneBusy(true);
    try {
      await requestOtp(profile.phone);
      setPhoneNotice(labels.otpSent);
      setResendIn(60);
      setPhoneMode('verify-otp');
    } catch {
      setPhoneError(labels.errorText);
    } finally {
      setPhoneBusy(false);
    }
  };

  const onVerifyChangePhone = async () => {
    if (phoneBusy || !profile) return;
    setPhoneError(null);
    if (phoneOtp.length !== 6) {
      setPhoneError(labels.otpInvalid);
      return;
    }
    setPhoneBusy(true);
    try {
      const national = newPhone
        .replace(/\D/g, '')
        .slice(newCountry.dialCode.length);
      const e164 = toE164(newCountry, national);
      const updated = await accountApi.changePhone({
        newPhone: e164,
        otp: phoneOtp,
      });
      setProfile(updated);
      cancelPhoneFlow();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const msg = err.message || '';
        if (msg.includes('already registered')) setPhoneError(labels.phoneTaken);
        else if (msg.includes('Invalid') || msg.includes('expired'))
          setPhoneError(labels.otpInvalid);
        else setPhoneError(labels.errorText);
      } else {
        setPhoneError(labels.errorText);
      }
    } finally {
      setPhoneBusy(false);
    }
  };

  const onVerifyCurrentPhone = async () => {
    if (phoneBusy || !profile) return;
    setPhoneError(null);
    if (phoneOtp.length !== 6) {
      setPhoneError(labels.otpInvalid);
      return;
    }
    setPhoneBusy(true);
    try {
      const updated = await accountApi.verifyCurrentPhone({ otp: phoneOtp });
      setProfile(updated);
      cancelPhoneFlow();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setPhoneError(
        err instanceof ApiError && err.status === 400
          ? labels.otpInvalid
          : labels.errorText,
      );
    } finally {
      setPhoneBusy(false);
    }
  };

  // ── Password change ──

  const onChangePassword = async () => {
    setPwError(null);
    setPwSaved(false);
    if (!currentPw) {
      setPwError(labels.wrongCurrentPassword);
      return;
    }
    if (newPw.length < 8) {
      setPwError(labels.weakPassword);
      return;
    }
    if (newPw !== confirmPw) {
      setPwError(labels.passwordMismatch);
      return;
    }
    setPwSaving(true);
    try {
      await accountApi.changePassword({
        currentPassword: currentPw,
        newPassword: newPw,
      });
      setPwSaved(true);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => setPwSaved(false), 2500);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setPwError(labels.wrongCurrentPassword);
      } else if (err instanceof ApiError && err.status === 400) {
        setPwError(labels.weakPassword);
      } else {
        setPwError(labels.errorText);
      }
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) return <p className={styles.state}>{labels.loading}</p>;
  if (error || !profile) return <p className={styles.state}>{error ?? labels.errorText}</p>;

  return (
    <div className={styles.wrap}>
      <h1 className={styles.h1}>{labels.title}</h1>

      <section className={styles.card}>
        <h2 className={styles.h2}>{labels.sectionProfile}</h2>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>{labels.fullName}</span>
          <input
            type="text"
            className={styles.input}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>{labels.email}</span>
          <input
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>{labels.phone}</span>
          <div className={styles.phoneRow}>
            <span className={styles.phoneVal}>{profile.phone}</span>
            <span className={profile.phoneVerified ? styles.chipOk : styles.chipWarn}>
              {profile.phoneVerified ? labels.phoneVerified : labels.phoneNotVerified}
            </span>
          </div>

          {phoneMode === 'idle' ? (
            <div className={styles.phoneActions}>
              <button
                type="button"
                className={styles.linkBtn}
                onClick={startChangePhone}
              >
                {labels.phoneChangeBtn}
              </button>
              {!profile.phoneVerified ? (
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={onSendVerifyCurrentOtp}
                  disabled={phoneBusy}
                >
                  {labels.phoneVerifyBtn}
                </button>
              ) : null}
            </div>
          ) : null}

          {phoneMode === 'change-form' ? (
            <div className={styles.phoneFlow}>
              <CountrySelector
                id="settings-country"
                locale={locale}
                value={newCountry}
                onChange={(c) => {
                  setNewCountry(c);
                  setNewPhone('');
                  setPhoneError(null);
                }}
                label={labels.countryLabel}
              />
              <PhoneInput
                id="settings-phone-new"
                label={labels.phoneNewLabel}
                value={newPhone}
                country={newCountry}
                onChange={setNewPhone}
                error={phoneError ?? undefined}
                autoComplete="tel"
              />
              <div className={styles.phoneActions}>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={onSendChangeOtp}
                  disabled={phoneBusy}
                >
                  {phoneBusy ? '…' : labels.phoneSendOtp}
                </button>
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={cancelPhoneFlow}
                  disabled={phoneBusy}
                >
                  {labels.phoneCancelBtn}
                </button>
              </div>
            </div>
          ) : null}

          {phoneMode === 'change-otp' ? (
            <div className={styles.phoneFlow}>
              <p className={styles.note}>{phoneNotice ?? labels.otpSent}</p>
              <OtpBoxes
                value={phoneOtp}
                onChange={setPhoneOtp}
                error={phoneError ?? undefined}
                label={labels.phoneOtpLabel}
                disabled={phoneBusy}
              />
              <div className={styles.phoneActions}>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={onVerifyChangePhone}
                  disabled={phoneBusy}
                >
                  {phoneBusy ? '…' : labels.phoneVerifyAction}
                </button>
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={cancelPhoneFlow}
                  disabled={phoneBusy}
                >
                  {labels.phoneCancelBtn}
                </button>
              </div>
            </div>
          ) : null}

          {phoneMode === 'verify-otp' ? (
            <div className={styles.phoneFlow}>
              <p className={styles.note}>{phoneNotice ?? labels.otpSent}</p>
              <OtpBoxes
                value={phoneOtp}
                onChange={setPhoneOtp}
                error={phoneError ?? undefined}
                label={labels.phoneOtpLabel}
                disabled={phoneBusy}
              />
              <div className={styles.phoneActions}>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={onVerifyCurrentPhone}
                  disabled={phoneBusy}
                >
                  {phoneBusy ? '…' : labels.phoneVerifyAction}
                </button>
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={cancelPhoneFlow}
                  disabled={phoneBusy}
                >
                  {labels.phoneCancelBtn}
                </button>
              </div>
            </div>
          ) : null}

          {phoneNotice && phoneMode !== 'change-otp' && phoneMode !== 'verify-otp' ? (
            <p className={styles.note}>{phoneNotice}</p>
          ) : null}
          {phoneError && phoneMode === 'idle' ? (
            <p className={styles.errorText}>{phoneError}</p>
          ) : null}
        </div>

        {saveError ? <div className={styles.formError}>{saveError}</div> : null}

        <div className={styles.actions}>
          <button type="button" className={styles.saveBtn} onClick={onSaveProfile} disabled={saving}>
            {saving ? labels.saving : labels.save}
          </button>
          {saved ? <span className={styles.saved}>{labels.saved}</span> : null}
        </div>
      </section>

      {profile.hasPassword ? (
      <section className={styles.card}>
        <h2 className={styles.h2}>{labels.sectionPassword}</h2>
        <p className={styles.note}>{labels.passwordNote}</p>

        <PasswordInput
          id="settings-currentpw"
          label={labels.currentPassword}
          value={currentPw}
          onChange={setCurrentPw}
          autoComplete="current-password"
        />
        <PasswordInput
          id="settings-newpw"
          label={labels.newPassword}
          value={newPw}
          onChange={setNewPw}
          autoComplete="new-password"
        />
        <PasswordInput
          id="settings-confirmpw"
          label={labels.confirmPassword}
          value={confirmPw}
          onChange={setConfirmPw}
          autoComplete="new-password"
        />

        {pwError ? <div className={styles.formError}>{pwError}</div> : null}

        <div className={styles.actions}>
          <button type="button" className={styles.saveBtn} onClick={onChangePassword} disabled={pwSaving}>
            {pwSaving ? '…' : labels.updatePassword}
          </button>
          {pwSaved ? <span className={styles.saved}>{labels.saved}</span> : null}
        </div>
      </section>
      ) : (
        <section className={styles.card}>
          <h2 className={styles.h2}>{labels.sectionPassword}</h2>
          <p className={styles.note}>
            {labels.passwordGoogleNote ?? (locale === 'bn'
              ? 'আপনি Google দিয়ে সাইন-ইন করেছেন — আলাদা পাসওয়ার্ড নেই।'
              : 'You signed in with Google — no separate password is set.')}
          </p>
        </section>
      )}
    </div>
  );
}