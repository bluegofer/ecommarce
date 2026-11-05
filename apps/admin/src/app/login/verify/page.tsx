import { Suspense } from 'react';
import { VerifyForm } from './VerifyForm';

export const dynamic = 'force-dynamic';

export default function LoginVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center text-slate-400">
          Loading…
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}