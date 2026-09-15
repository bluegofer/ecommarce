'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AccountSidebar.module.css';

export interface AccountSidebarLabels {
  overview: string;
  orders: string;
  wishlist: string;
  addresses: string;
  settings: string;
  signOut: string;
}

export interface AccountSidebarProps {
  locale: 'bn' | 'en';
  labels: AccountSidebarLabels;
  onSignOut: () => void;
}

export function AccountSidebar({ locale, labels, onSignOut }: AccountSidebarProps) {
  const pathname = usePathname() ?? '';
  const base = `/${locale}/account`;

  const items = [
    { href: base, label: labels.overview },
    { href: `${base}/orders`, label: labels.orders },
    { href: `${base}/wishlist`, label: labels.wishlist },
    { href: `${base}/addresses`, label: labels.addresses },
    { href: `${base}/settings`, label: labels.settings },
  ];

  const isActive = (href: string) => {
    if (href === base) return pathname === base || pathname === `${base}/`;
    return pathname.startsWith(href);
  };

  return (
    <nav className={styles.nav} aria-label="Account">
      <ul className={styles.list}>
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              className={[styles.item, isActive(it.href) ? styles.active : ''].filter(Boolean).join(' ')}
              aria-current={isActive(it.href) ? 'page' : undefined}
            >
              {it.label}
            </Link>
          </li>
        ))}
        <li>
          <button type="button" className={styles.signOut} onClick={onSignOut}>
            {labels.signOut}
          </button>
        </li>
      </ul>
    </nav>
  );
}