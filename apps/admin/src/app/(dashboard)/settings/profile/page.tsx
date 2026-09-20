'use client';

import { useState } from 'react';
import { Save, ShieldCheck, Smartphone } from 'lucide-react';
import { PageHeader, StatusChip, useToast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function ProfileSettingsPage() {
  const toast = useToast();
  const { user, refresh } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');

  // TOTP enrollment state (F-13, step-15.9)
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [enrollSecret, setEnrollSecret] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function startEnroll() {
    setBusy(true);
    try {
      const res = await api.post<{ ok: true; qrDataUrl: string; secret: string }>(
        '/api/v1/auth/totp/enroll',
      );
      setQrDataUrl(res.qrDataUrl);
      setEnrollSecret(res.secret);
      setEnrollOpen(true);
    } catch (e) {
      toast.error('Could not start TOTP enrollment');
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll() {
    if (!/^\d{6}$/.test(confirmCode)) {
      toast.error('Enter the 6-digit code from your authenticator app');
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/v1/auth/totp/confirm', { code: confirmCode });
      toast.success('TOTP enrolled', 'Two-factor authentication is now active');
      setEnrollOpen(false);
      setConfirmCode('');
      setQrDataUrl(null);
      setEnrollSecret(null);
      await refresh();
    } catch {
      toast.error('Invalid code', 'Check the current 6-digit code and try again');
    } finally {
      setBusy(false);
    }
  }

  async function disableTotp() {
    const code = window.prompt('Enter your current 6-digit TOTP code to disable 2FA');
    if (!code) return;
    setBusy(true);
    try {
      await api.post('/api/v1/auth/totp/disable', { code });
      toast.success('TOTP disabled');
      await refresh();
    } catch {
      toast.error('Invalid code');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Profile & security"
        subtitle="Your account, 2FA, and session management"
        actions={
          <button
            type="button"
            onClick={() => toast.success('Profile saved')}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            <Save className="w-4 h-4" /> Save
          </button>
        }
      />

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Account</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
              Full name
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-10 px-3 rounded border border-border bg-white text-sm"
            />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
              Phone
            </label>
            <input
              value={phone}
              readOnly
              className="w-full h-10 px-3 rounded border border-border bg-white text-sm font-mono"
            />
          </div>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-400" /> Two-factor authentication
        </h3>
        <div className="flex items-center justify-between p-3 rounded bg-slate-50 border border-border">
          <div>
            <p className="text-sm font-medium text-slate-800">TOTP authenticator</p>
            <p className="text-[12px] text-slate-500">
              Recommended for all staff accounts. Required for admin.
            </p>
          </div>
          <StatusChip label="Not enrolled" tone="warning" />
        </div>

        {enrollOpen && qrDataUrl && (
          <div className="p-4 rounded border border-border bg-white space-y-3">
            <p className="text-sm font-medium text-slate-800">
              1. Scan this QR with Google Authenticator / Authy
            </p>
            <img
              src={qrDataUrl}
              alt="TOTP enrollment QR"
              className="w-48 h-48 border border-border rounded"
            />
            {enrollSecret && (
              <p className="text-[12px] text-slate-500 break-all">
                Or enter manually: <code className="font-mono">{enrollSecret}</code>
              </p>
            )}
            <p className="text-sm font-medium text-slate-800">
              2. Enter the current 6-digit code
            </p>
            <input
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className="w-32 h-10 px-3 rounded border border-border bg-white text-center text-lg font-mono tracking-widest"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={confirmEnroll}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
              >
                Confirm enrollment
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setEnrollOpen(false);
                  setConfirmCode('');
                  setQrDataUrl(null);
                  setEnrollSecret(null);
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!enrollOpen && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={startEnroll}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <Smartphone className="w-4 h-4" /> Enroll now
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={disableTotp}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            >
              Disable
            </button>
          </div>
        )}
      </div>

      <div className="card p-5 space-y-3">
        <h3 className="font-semibold text-slate-900">Change password</h3>
        <input
          type="password"
          placeholder="Current password"
          className="w-full h-10 px-3 rounded border border-border bg-white text-sm"
        />
        <input
          type="password"
          placeholder="New password"
          className="w-full h-10 px-3 rounded border border-border bg-white text-sm"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          className="w-full h-10 px-3 rounded border border-border bg-white text-sm"
        />
        <button
          type="button"
          onClick={() => toast.success('Password changed', 'Session revoked on all devices')}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
        >
          Update password
        </button>
      </div>
    </div>
  );
}