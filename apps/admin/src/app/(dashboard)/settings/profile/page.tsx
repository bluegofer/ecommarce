'use client';

import { useState } from 'react';
import { Save, ShieldCheck, Smartphone } from 'lucide-react';
import { PageHeader, StatusChip, useToast } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function ProfileSettingsPage() {
  const toast = useToast();
  const { user } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');

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
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full h-10 px-3 rounded border border-border bg-white text-sm" />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full h-10 px-3 rounded border border-border bg-white text-sm font-mono" />
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
            <p className="text-[12px] text-slate-500">Recommended for all staff accounts</p>
          </div>
          <StatusChip label="Not enrolled" tone="warning" />
        </div>
        <button
          type="button"
          onClick={() => toast.push({ tone: 'info', title: 'Enroll TOTP', description: 'QR code modal in Step 12 auth wiring.' })}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Smartphone className="w-4 h-4" /> Enroll now
        </button>
      </div>

      <div className="card p-5 space-y-3">
        <h3 className="font-semibold text-slate-900">Change password</h3>
        <input type="password" placeholder="Current password" className="w-full h-10 px-3 rounded border border-border bg-white text-sm" />
        <input type="password" placeholder="New password" className="w-full h-10 px-3 rounded border border-border bg-white text-sm" />
        <input type="password" placeholder="Confirm new password" className="w-full h-10 px-3 rounded border border-border bg-white text-sm" />
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