'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';

export function GoogleCallbackClient({ locale }: { locale: 'bn' | 'en' }) {
  const { completeOAuthLogin } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = searchParams.get('access_token');
    const needsPhone = searchParams.get('needs_phone') === '1';

    if (!token) {
      setError(locale === 'bn' ? '\u09B2\u0997\u0987\u09A8 \u09B8\u09AE\u09CD\u09AA\u09C2\u09B0\u09CD\u09A3 \u09B9\u09AF\u09BC\u09A8\u09BF\u0964' : 'Sign-in did not complete.');
      return;
    }

    completeOAuthLogin(token)
      .then(() => {
        const dest = needsPhone
          ? '/' + locale + '/account/settings?requirePhone=1'
          : '/' + locale + '/account';
        router.replace(dest);
      })
      .catch((err) => {
        setError(err?.message ?? (locale === 'bn' ? '\u09B2\u0997\u0987\u09A8 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964' : 'Sign-in failed.'));
      });
  }, [searchParams, completeOAuthLogin, router, locale]);

  if (error) {
    return (
      <main style={{ padding: 24, textAlign: 'center', minHeight: '60vh' }}>
        <p style={{ color: '#D62828', marginBottom: 16 }}>{error}</p>
        <a
          href={'/' + locale + '/signin'}
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: '#FF8A1E',
            color: '#fff',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          {locale === 'bn' ? '\u09B2\u0997\u0987\u09A8\u09C7 \u09AB\u09BF\u09B0\u09C7 \u09AF\u09BE\u09A8' : 'Back to Sign In'}
        </a>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, textAlign: 'center', minHeight: '60vh' }}>
      <p>{locale === 'bn' ? '\u09B2\u0997\u0987\u09A8 \u09B9\u099A\u09CD\u099B\u09C7\u2026' : 'Signing you in...'}</p>
    </main>
  );
}