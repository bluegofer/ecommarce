'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-sky-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 mb-5">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>

        <div className="bg-surface rounded shadow-md border border-border p-8">
          <h1 className="text-xl font-semibold text-slate-900">Reset password</h1>
          <p className="text-[12.5px] text-slate-500 mt-1 mb-6">
            We&apos;ll send a one-time reset link to your email.
          </p>

          {sent ? (
            <div className="text-center py-4">
              <p className="text-sm text-success-700 font-medium">Reset link sent</p>
              <p className="text-[12.5px] text-slate-500 mt-1.5">
                Check your inbox — the link expires in 15 minutes.
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="email" className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@bluegofer.com"
                  className="w-full h-10 px-3 rounded border border-border bg-white text-sm focus:border-sky-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full h-10 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
              >
                Send reset link
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}