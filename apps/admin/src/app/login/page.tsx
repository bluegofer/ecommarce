'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = params?.get('next') ?? '/';

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
      toast.success('Signed in');
      router.replace(next);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign in failed';
      setError(msg);
      toast.error('Sign in failed', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-sky-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <div className="bg-surface rounded shadow-md border border-border p-8">
          <div className="text-center mb-7">
            <span className="inline-grid w-14 h-14 place-items-center rounded-xl bg-sky-600 text-white text-2xl mb-3">
              🛍️
            </span>
            <h1 className="text-xl font-semibold text-slate-900">BlueGofer Admin</h1>
            <p className="text-[12.5px] text-slate-500 mt-1">Admin &amp; Operations Console</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded bg-danger-50 border border-danger-200 text-danger-700 text-[12.5px]">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
                Email / Username
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@bluegofer.com"
                className="w-full h-10 px-3 rounded border border-border bg-white text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-3 rounded border border-border bg-white text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <label className="flex items-center gap-2 text-[12.5px] text-slate-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-border text-sky-600 focus:ring-sky-400"
              />
              Remember this device
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <Link
            href="/login/forgot"
            className="block text-center text-[12.5px] font-medium text-sky-600 hover:text-sky-700 mt-4"
          >
            Forgot password?
          </Link>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-slate-400">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            type="button"
            disabled
            className="w-full h-10 rounded border border-border bg-white text-sm font-medium text-slate-400 cursor-not-allowed"
          >
            🔐 Continue with SSO (coming soon)
          </button>

          <p className="mt-5 text-[11.5px] text-slate-400 leading-relaxed">
            2FA (TOTP) verification on the next step · Session cookies are HttpOnly (per TDD §10.1). No credentials are stored in localStorage.
          </p>
        </div>
      </div>
    </div>
  );
}