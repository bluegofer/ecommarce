import Link from 'next/link';
import styles from './Footer.module.css';

export interface FooterColumn {
  /** Locale-resolved heading. */
  heading: string;
  links: { label: string; href: string }[];
}

export interface FooterProps {
  /** Locale for labels + hrefs prefix. */
  locale: 'bn' | 'en';
  /** Column groups; typically 4 (UI Spec B3). */
  columns: FooterColumn[];
  /** Labels provided by caller from i18n dictionary. */
  labels: {
    backTop: string;
    about: string;
    contact: string;
    faq: string;
    privacy: string;
    terms: string;
    returns: string;
    language: string;
    currency: string;
    country: string;
    brand: string;
  };
}

export function Footer({ locale, columns, labels }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <a href="#top" className={styles.backTop}>{labels.backTop}</a>

      <div className={styles.columns}>
        {columns.map((col) => (
          <details key={col.heading} className={styles.column} open>
            <summary className={styles.heading}>
              <span>{col.heading}</span>
              <Chevron />
            </summary>
            <ul className={styles.links}>
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      <div className={styles.divider} />

      <div className={styles.brandCenter}>
        <span className={styles.brandMark}>
          <Pin /> {labels.brand}
        </span>
        <div className={styles.selectors}>
          <span>{labels.language}: {locale === 'bn' ? 'বাংলা' : 'English'}</span>
          <span aria-hidden="true">·</span>
          <span>{labels.currency}: ৳ BDT</span>
          <span aria-hidden="true">·</span>
          <span>{labels.country}: BD</span>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <span>© {year} {labels.brand}</span>
        <nav className={styles.legal} aria-label="Legal">
          <Link href={`/${locale}/pages/terms`}>{labels.terms}</Link>
          <span aria-hidden="true">·</span>
          <Link href={`/${locale}/pages/privacy`}>{labels.privacy}</Link>
          <span aria-hidden="true">·</span>
          <Link href={`/${locale}/pages/returns`}>{labels.returns}</Link>
        </nav>
      </div>
    </footer>
  );
}

function Chevron() {
  return (
    <svg className={styles.chevron} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Pin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22s8-6.5 8-12a8 8 0 10-16 0c0 5.5 8 12 8 12z" fill="var(--sk-brand-300)" />
      <circle cx="12" cy="10" r="3" fill="var(--sk-brand-950)" />
    </svg>
  );
}