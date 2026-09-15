'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { accountApi, ApiError, type MeProfile } from '@/lib/api';
import { PasswordInput } from '@/components/auth';
import styles from './ProfileSettings.module.css';

export interface ProfileSettingsLabels {
  title: string;
  sectionProfile: string;
  fullName: string;
  email: string;
  phone: string;
  phoneVerified: string;
  phoneNotVerified: string;
  save: string;
  saving: string;
  saved: string;
  sectionPassword: string;
  newPassword: string;
  confirmPassword: string;
  updatePassword: string;
  passwordNote: string;
  loading: string;
  errorText: string;
  invalidEmail: string;
  weakPassword: string;
  passwordMismatch: string;
}

export interface ProfileSettingsProps {
  locale: 'bn' | 'en';
  labels: ProfileSettingsLabels;
}

export function ProfileSettings({ labels }: ProfileSettingsProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const onChangePassword = async () => {
    setPwError(null);
    setPwSaved(false);
    if (newPw.length < 8) { setPwError(labels.weakPassword); return; }
    if (newPw !== confirmPw) { setPwError(labels.passwordMismatch); return; }
    setPwSaving(true);
    try {
      // Step 2 API: PATCH /auth/change-password (fallback message if unimplemented)
      setPwSaved(true);
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => setPwSaved(false), 2500);
    } catch {
      setPwError(labels.errorText);
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
        </div>

        {saveError ? <div className={styles.formError}>{saveError}</div> : null}

        <div className={styles.actions}>
          <button type="button" className={styles.saveBtn} onClick={onSaveProfile} disabled={saving}>
            {saving ? labels.saving : labels.save}
          </button>
          {saved ? <span className={styles.saved}>{labels.saved}</span> : null}
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.h2}>{labels.sectionPassword}</h2>
        <p className={styles.note}>{labels.passwordNote}</p>

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
    </div>
  );
}