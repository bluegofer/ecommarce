import { Suspense } from 'react';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center text-slate-400">
          Loading…
        </div>
      }
    >
      <div className="min-h-screen flex flex-col bg-slate-50">
        <header className="h-14 px-4 sm:px-6 flex items-center border-b border-border bg-white">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 grid place-items-center rounded-lg bg-sky-600 text-white text-base">
              🛍️
            </span>
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-slate-900 text-sm">BlueGofer</span>
              <span className="text-[10px] text-slate-500">Admin Console</span>
            </div>
          </div>
        </header>

        <main className="flex-1 grid place-items-center px-4 py-8 sm:px-6 sm:py-12">
          <div className="w-full max-w-sm">
            <div className="card p-6 sm:p-8">
              <LoginForm />
            </div>
            <p className="text-center text-[12px] text-slate-400 mt-4">
              © {new Date().getFullYear()} BlueGofer — Staff only
            </p>
          </div>
        </main>
      </div>
    </Suspense>
  );
}