import Link from 'next/link';
import styles from './Breadcrumbs.module.css';

export interface BreadcrumbItem {
  /** Locale-resolved label. */
  label: string;
  /** When omitted, item is treated as the current page (not a link). */
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  /** Max visible crumbs before middle-truncating. UI Spec B4: 4. */
  maxVisible?: number;
  /** Locale for aria label. */
  locale?: 'bn' | 'en';
  className?: string;
}

/**
 * Breadcrumb strip (UI Spec B4, T2-5 polish).
 * - First item (Home) is rendered as a prominent branded pill.
 * - Remaining items render as the classic chain with › separators.
 * - Last item is bold + non-interactive (current page).
 * - Middle items are truncated: [home] [2nd-last, last] when long.
 * - Renders BreadcrumbList JSON-LD for SEO.
 */
export function Breadcrumbs({ items, maxVisible = 4, locale = 'en', className }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  const [first, ...rest] = items;
  const isHome =
    !!first &&
    (first.href === '/' ||
      first.href === `/${locale}` ||
      first.href === `/${locale}/` ||
      first.label === 'Home' ||
      first.label === 'হোম');
  const homeHref = first?.href ?? `/${locale}`;
  const homeLabel = locale === 'bn' ? 'হোম' : 'Home';
  const restItems = isHome ? rest : items;
  const truncated = truncateMiddle(restItems, maxVisible);
  const ariaLabel = locale === 'bn' ? 'ব্রেডক্রাম্ব' : 'Breadcrumb';

  return (
    <>
      <nav className={[styles.wrap, className].filter(Boolean).join(' ')} aria-label={ariaLabel}>
        {isHome ? (
          <Link href={homeHref} className={styles.homeBtn}>
            <span className={styles.homeIcon} aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V10.5z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            {homeLabel}
          </Link>
        ) : null}
        <ol className={styles.list}>
          {truncated.map((item, idx) => {
            const isLast = idx === truncated.length - 1;
            const isEllipsis = item.label === '…';
            return (
              <li key={`${item.label}-${idx}`} className={styles.item}>
                {isEllipsis ? (
                  <span className={styles.ellipsis} aria-hidden="true">…</span>
                ) : isLast || !item.href ? (
                  <span className={styles.current} aria-current="page">{item.label}</span>
                ) : (
                  <Link href={item.href} className={styles.link}>{item.label}</Link>
                )}
                {!isLast && <span className={styles.sep} aria-hidden="true">›</span>}
              </li>
            );
          })}
        </ol>
      </nav>
      <BreadcrumbJsonLd items={items} />
    </>
  );
}

function truncateMiddle(items: BreadcrumbItem[], maxVisible: number): BreadcrumbItem[] {
  if (items.length <= maxVisible) return items;
  // Keep first, ellipsis, second-last, last (UI Spec: "first, ..., second-last, last")
  return [items[0]!, { label: '…' }, items[items.length - 2]!, items[items.length - 1]!];
}

function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nolimitshopping.com';
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.label,
      ...(item.href ? { item: `${origin}${item.href}` } : {}),
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}