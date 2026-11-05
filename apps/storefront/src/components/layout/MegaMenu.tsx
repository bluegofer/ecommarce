'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { CmsMenuDto, CmsMenuItemDto } from '@ecommarce/types';
import styles from './MegaMenu.module.css';

// ─────────────────────────────────────────────────────────────────────
// Public types — backward compatible with existing pages
// ─────────────────────────────────────────────────────────────────────

export interface MegaMenuCategory {
  slug?: string;
  name?: string;
  nameBn?: string;
  id?: string;
  label?: string;
  href?: string;
  children?: MegaMenuCategory[];
}

export interface MegaMenuLabels {
  mainMenu: string;
  trending?: string;
  shopByCategory?: string;
  helpAndServices?: string;
  customerService?: string;
  bestSellers?: string;
  newArrivals?: string;
  todaysDeals?: string;
  signIn?: string;
  hello?: string;
  greeting?: string;
  orders?: string;
  [key: string]: string | undefined;
}

export interface MegaMenuProps {
  open: boolean;
  onClose: () => void;
  locale: 'bn' | 'en';
  categories: MegaMenuCategory[];
  labels: MegaMenuLabels;
  signedIn?: boolean;
  userName?: string;
}

// ─────────────────────────────────────────────────────────────────────
// Icons (inline SVG — storefront has no lucide-react)
// ─────────────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline
        points="9 18 15 12 9 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline
        points="6 9 12 15 18 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Normalization — legacy + new category shapes → uniform tree
// ─────────────────────────────────────────────────────────────────────

interface NormalizedCategory {
  slug: string;
  label: string;
  children: NormalizedCategory[];
}

function normalizeCategory(c: MegaMenuCategory): NormalizedCategory {
  const slugFromHref: string = c.href
    ? c.href.replace(/^\/?(?:bn|en)?\/c\//, '')
    : '';
  const slug: string = (c.slug ?? slugFromHref) || c.id || '';
  const label: string = c.name ?? c.label ?? c.id ?? '';
  return {
    slug,
    label,
    children: (c.children ?? []).map(normalizeCategory),
  };
}

function cmsToCategory(item: CmsMenuItemDto): NormalizedCategory {
  const slugFromUrl = deriveSlugFromUrl(item.url);
  return {
    slug: slugFromUrl || item.id,
    label: item.labelEn,
    children: (item.children ?? []).map(cmsToCategory),
  };
}

function deriveSlugFromUrl(url: string): string {
  if (!url) return '';
  const catMatch = url.match(/\/c\/([^/?#]+)/);
  if (catMatch && catMatch[1]) return catMatch[1];
  return url.replace(/^\/+/, '').replace(/\//g, '-');
}

// ─────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────

export function MegaMenu({
  open,
  onClose,
  locale,
  categories,
  labels,
  signedIn,
  userName,
}: MegaMenuProps) {
  const [cmsMenu, setCmsMenu] = useState<CmsMenuDto | null>(null);
  const [cmsError, setCmsError] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCmsError(false);

    fetch('/api/v1/cms/menus/mobile', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CmsMenuDto | null) => {
        if (cancelled) return;
        if (data && data.items && data.items.length > 0) {
          setCmsMenu(data);
        } else {
          setCmsError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setCmsError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) setExpanded(new Set());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const shopByCategoryItems = useMemo<NormalizedCategory[]>(() => {
    if (!cmsError && cmsMenu && cmsMenu.items && cmsMenu.items.length > 0) {
      return cmsMenu.items.map(cmsToCategory);
    }
    return categories.map(normalizeCategory);
  }, [cmsMenu, cmsError, categories]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className={styles.scrim}
        onClick={onClose}
        aria-label="Close menu"
      />

      <div className={styles.drawer} role="dialog" aria-modal="true" aria-label={labels.mainMenu}>
        <div className={styles.header}>
          <div className={styles.greeting}>{labels.mainMenu}</div>
          <button
            type="button"
            onClick={onClose}
            className={styles.close}
            aria-label="Close menu"
          >
            <XIcon />
          </button>
        </div>

        {signedIn && (
          <div className={styles.section}>
            <div className={styles.greeting}>
              {(labels.greeting ?? labels.hello ?? 'Hello') +
                (userName ? `, ${userName}` : '')}
            </div>
          </div>
        )}

        <div className={styles.body}>
          {labels.trending && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>{labels.trending}</h3>
              <ul className={styles.rows}>
                <li>
                  <Link href={`/${locale}/deals`} className={styles.row}>
                    <span className={styles.rowLabel}>{labels.todaysDeals ?? "Today's Deals"}</span>
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/s?sort=best-sellers`} className={styles.row}>
                    <span className={styles.rowLabel}>{labels.bestSellers ?? 'Best Sellers'}</span>
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/s?sort=newest`} className={styles.row}>
                    <span className={styles.rowLabel}>{labels.newArrivals ?? 'New Arrivals'}</span>
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {labels.shopByCategory && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>{labels.shopByCategory}</h3>
              {shopByCategoryItems.length === 0 ? (
                <p className={styles.emptySmall}>No categories yet.</p>
              ) : (
                <ul className={styles.rows}>
                  {shopByCategoryItems.map((cat) => (
                    <CategoryAccordion
                      key={cat.slug}
                      category={cat}
                      locale={locale}
                      expanded={expanded}
                      onToggle={toggle}
                      level={0}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}

          {labels.helpAndServices && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>{labels.helpAndServices}</h3>
              <ul className={styles.rows}>
                {labels.customerService && (
                  <li>
                    <Link href={`/${locale}/pages/contact`} className={styles.row}>
                      <span className={styles.rowLabel}>{labels.customerService}</span>
                    </Link>
                  </li>
                )}
                <li>
                  <Link href={`/${locale}/account/orders`} className={styles.row}>
                    <span className={styles.rowLabel}>{labels.orders ?? 'Your Orders'}</span>
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/pages/faq`} className={styles.row}>
                    <span className={styles.rowLabel}>FAQ</span>
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className={styles.section}>
          {signedIn ? (
            <Link
              href={`/${locale}/account`}
              className={`${styles.footerAction} ${styles.footerActionSecondary}`}
              onClick={onClose}
            >
              My Account
            </Link>
          ) : (
            <Link
              href={`/${locale}/signin`}
              className={`${styles.footerAction} ${styles.footerActionPrimary}`}
              onClick={onClose}
            >
              {labels.signIn ?? 'Sign In'}
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Category accordion (recursive)
// ─────────────────────────────────────────────────────────────────────

function CategoryAccordion({
  category,
  locale,
  expanded,
  onToggle,
  level,
}: {
  category: NormalizedCategory;
  locale: 'bn' | 'en';
  expanded: Set<string>;
  onToggle: (id: string) => void;
  level: number;
}) {
  const hasChildren = category.children.length > 0;
  const isOpen = expanded.has(category.slug);

  if (!hasChildren) {
    return (
      <li>
        <Link
          href={`/${locale}/c/${category.slug}`}
          className={styles.accordionLink}
          style={{ paddingLeft: 4 + level * 14 }}
        >
          {category.label}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <div className={styles.accordionHeader}>
        <Link
          href={`/${locale}/c/${category.slug}`}
          className={styles.accordionLink}
          style={{ paddingLeft: 4 + level * 14 }}
        >
          {category.label}
        </Link>
        <button
          type="button"
          onClick={() => onToggle(category.slug)}
          className={styles.chevronBtn}
          aria-label={isOpen ? 'Collapse' : 'Expand'}
        >
          {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </button>
      </div>
      {isOpen && (
        <ul className={`${styles.rows} ${styles.nested}`}>
          {category.children.map((child) => (
            <CategoryAccordion
              key={child.slug}
              category={child}
              locale={locale}
              expanded={expanded}
              onToggle={onToggle}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}