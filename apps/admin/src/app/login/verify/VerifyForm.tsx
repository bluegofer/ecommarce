'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui';

export function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { verifyTotp, user } = useAuth();

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const next = params?.get('next') ?? '/';

  useEffect(() => {
    if (user) router.replace(next);
  }, [user, next, router]);

  function setDigit(i: number, v: string) {
    if (!/^\d?$/.test(v)) return;
    const copy = [...digits];
    copy[i] = v;
    setDigits(copy);
    if (v && i < 5) inputs.current[i + 1]?.focus();
  }

  async function submit() {
    const code = digits.join('');
    if (code.length !== 6) {
      toast.error('Enter all 6 digits');
      return;
    }
    setVerifying(true);
    try {
      await verifyTotp(code);
      toast.success('Signed in');
      router.replace(next);
    } catch (e) {
      toast.error('Invalid code', e instanceof Error ? e.message : 'Try again');
      setDigits(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-sky-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <div className="bg-surface rounded shadow-md border border-border p-8">
          <div className="text-center mb-6">
            <span className="inline-grid w-14 h-14 place-items-center rounded-xl bg-sky-100 text-sky-700 mb-3">
              <ShieldCheck className="w-7 h-7" />
            </span>
            <h1 className="text-xl font-semibold text-slate-900">Two-factor code</h1>
            <p className="text-[12.5px] text-slate-500 mt-1">
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>

          <div className="flex justify-center gap-2 mb-5">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !d && i > 0) inputs.current[i - 1]?.focus();
                  if (e.key === 'Enter') void submit();
                }}
                autoFocus={i === 0}
                className="w-12 h-14 text-center text-xl font-semibold tabular-nums rounded border border-border bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => void submit()}
            disabled={verifying}
            className="w-full h-10 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
          >
            {verifying ? 'Verifying…' : 'Verify & sign in'}
          </button>

          <p className="mt-5 text-[11.5px] text-slate-400 text-center">
            Lost your device? Contact your Super Admin to reset 2FA.
          </p>
        </div>
      </div>
    </div>
  );
}