'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { AccountSidebar, type AccountSidebarLabels } from './AccountSidebar';
import styles from './AccountLayoutClient.module.css';

export interface AccountLayoutClientProps {
  locale: 'bn' | 'en';
  sidebarLabels: AccountSidebarLabels;
  children: React.ReactNode;
}

export function AccountLayoutClient({
  locale,
  sidebarLabels,
  children,
}: AccountLayoutClientProps) {
  const { signedIn, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? `/${locale}/account`;

  useEffect(() => {
    if (loading) return;
    if (!signedIn) {
      const next = encodeURIComponent(pathname);
      router.replace(`/${locale}/signin?next=${next}`);
    }
  }, [signedIn, loading, router, locale, pathname]);

  const onSignOut = async () => {
    await logout();
    router.push(`/${locale}`);
  };

  if (loading || !signedIn) {
    return (
      <div className={styles.loadingWrap} role="status" aria-live="polite">
        <div className={styles.spinner} aria-hidden="true" />
        <span className={styles.loadingText}>…</span>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <AccountSidebar locale={locale} labels={sidebarLabels} onSignOut={onSignOut} />
      <div className={styles.content}>{children}</div>
    </div>
  );
}