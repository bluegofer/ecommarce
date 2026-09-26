'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui';

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = params.get('next') ?? '/';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn(email, password);
      if (res.requireTotp) {
        router.replace(`/login/verify?next=${encodeURIComponent(next)}`);
        return;
      }
      if (res.mustEnrollTotp) {
        toast.push({
          tone: 'warning',
          title: 'TOTP not enrolled',
          description: 'Enroll 2FA to fully secure your admin account.',
        });
        router.replace('/settings/profile');
        return;
      }
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 w-full max-w-sm">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Admin sign in</h1>
        <p className="text-sm text-slate-500">
          Staff access only — 2FA required
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Email or phone
        </label>
        <input
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
          className="w-full h-10 px-3 rounded border border-border bg-white text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full h-10 px-3 rounded border border-border bg-white text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-10 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
      >
        {loading ? 'Signing in…' : 'Sign In →'}
      </button>
    </form>
  );
}