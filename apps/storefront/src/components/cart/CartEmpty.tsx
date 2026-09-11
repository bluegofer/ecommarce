import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './CartEmpty.module.css';

export interface CartEmptyProps {
  locale: 'bn' | 'en';
  labels: {
    title: string;
    body: string;
    cta: string;
  };
}

export function CartEmpty({ locale, labels }: CartEmptyProps) {
  return (
    <div className={styles.wrap}>
      <EmptyState
        title={labels.title}
        body={labels.body}
        illustration={<CartIllustration />}
        action={
          <Link href={`/${locale}/deals`} className={styles.cta}>
            {labels.cta}
          </Link>
        }
      />
    </div>
  );
}

function CartIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 4h2l2.4 11.2a2 2 0 002 1.6h7.8a2 2 0 002-1.6L21 8H6"
        stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="20" r="1.4" fill="currentColor" />
      <circle cx="17.5" cy="20" r="1.4" fill="currentColor" />
    </svg>
  );
}