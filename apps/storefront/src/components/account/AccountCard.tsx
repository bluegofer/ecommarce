'use client';

import Link from 'next/link';
import styles from './AccountCard.module.css';

export interface AccountCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AccountCard({ href, icon, title, subtitle }: AccountCardProps) {
  return (
    <Link href={href} className={styles.card}>
      <span className={styles.icon} aria-hidden="true">{icon}</span>
      <span className={styles.title}>{title}</span>
      <span className={styles.subtitle}>{subtitle}</span>
    </Link>
  );
}