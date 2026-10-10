import Link from 'next/link';
import type { CategoryNode } from '@/lib/api/types';
import styles from './CategoryTiles.module.css';

export interface CategoryTilesProps {
  categories: CategoryNode[];
  locale: 'bn' | 'en';
  /** How many tiles to show (UI Spec C1: 4). */
  limit?: number;
}

export function CategoryTiles({ categories, locale, limit = 4 }: CategoryTilesProps) {
  const shown = categories.slice(0, limit);
  if (shown.length === 0) return null;

  return (
    <nav className={styles.row} aria-label={locale === 'bn' ? 'ক্যাটাগরি' : 'Categories'}>
      {shown.map((cat) => (
        <Link key={cat.id} href={`/${locale}/c/${cat.slug}`} className={styles.tile}>
          <span className={styles.icon} aria-hidden="true">
            <CategoryIcon name={cat.iconName} />
          </span>
          <span className={styles.label}>
            {locale === 'bn' ? cat.nameBn : cat.nameEn}
          </span>
        </Link>
      ))}
    </nav>
  );
}

function CategoryIcon({ name }: { name: string | null }) {
  const common = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'device':
      return <svg {...common}><rect x="4" y="3" width="16" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>;
    case 'shirt':
      return <svg {...common}><path d="M4 8l4-4 4 3 4-3 4 4-3 3v9H7v-9L4 8z" /></svg>;
    case 'home':
      return <svg {...common}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>;
    case 'sparkles':
      return <svg {...common}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
  }
}