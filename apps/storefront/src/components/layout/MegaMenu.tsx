'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './MegaMenu.module.css';

export interface MegaMenuCategory {
  id: string;
  label: string;
  href: string;
  /** Second-level children. */
  children?: MegaMenuCategory[];
}

export interface MegaMenuLabels {
  greeting: string;
  trending: string;
  bestSellers: string;
  newReleases: string;
  todayDeals: string;
  shopByCategory: string;
  helpServices: string;
  customerService: string;
  languageSwitch: string;
  empty: string;
  back: string;
  mainMenu: string;
}

export interface MegaMenuProps {
  open: boolean;
  onClose: () => void;
  locale: 'bn' | 'en';
  categories: MegaMenuCategory[];
  labels: MegaMenuLabels;
  /** Whether the user is signed in (shows greeting vs Sign In link). */
  signedIn?: boolean;
  userName?: string;
}

/**
 * Mega-menu drawer (UI Spec B2).
 * Slides from the left; 3-level navigation; focus-trapped via Drawer primitives.
 * The drawer chrome (scrim, focus, scroll lock) is inline here to avoid a
 * second layer of portal composition — behavior matches Modal/Drawer.
 */
export function MegaMenu({
  open,
  onClose,
  locale,
  categories,
  labels,
  signedIn = false,
  userName,
}: MegaMenuProps) {
  // Track the currently-open level-2 panel by parent id.
  const [openParentId, setOpenParentId] = useState<string | null>(null);

  // Reset the level-2 panel when the menu closes.
  useEffect(() => {
    if (!open) setOpenParentId(null);
  }, [open]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Esc closes (or backs out of level-2 first).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (openParentId) {
        e.stopPropagation();
        setOpenParentId(null);
      } else {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, openParentId, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const openParent = categories.find((c) => c.id === openParentId) ?? null;
  const isEmpty = categories.length === 0;

  return (
    <div
      className={styles.scrim}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <div
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={labels.mainMenu}
      >
        {/* Header row */}
        <div className={styles.header}>
          {openParent ? (
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setOpenParentId(null)}
            >
              <ChevronLeft />
              <span>{labels.back}</span>
            </button>
          ) : (
            <span className={styles.greeting}>
              {signedIn && userName ? `Hello, ${userName}` : labels.greeting}
            </span>
          )}
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Level-2 panel or root */}
        {openParent ? (
          <div className={styles.panel}>
            <div className={styles.panelTitle}>{openParent.label}</div>
            <ul className={styles.rows}>
              <li>
                <Link href={openParent.href} className={styles.row} onClick={onClose}>
                  <span>{openParent.label}</span>
                </Link>
              </li>
              {openParent.children?.map((child) => (
                <li key={child.id}>
                  <Link href={child.href} className={styles.row} onClick={onClose}>
                    <span>{child.label}</span>
                  </Link>
                </li>
              ))}
              {!openParent.children || openParent.children.length === 0 ? (
                <li className={styles.emptySmall}>—</li>
              ) : null}
            </ul>
          </div>
        ) : (
          <div className={styles.body}>
            <Section title={labels.trending}>
              <MenuLink href={`/${locale}/deals`} onClick={onClose}>{labels.bestSellers}</MenuLink>
              <MenuLink href={`/${locale}/deals`} onClick={onClose}>{labels.newReleases}</MenuLink>
              <MenuLink href={`/${locale}/deals`} onClick={onClose}>{labels.todayDeals}</MenuLink>
            </Section>

            <Section title={labels.shopByCategory}>
              {isEmpty ? (
                <div className={styles.empty}>{labels.empty}</div>
              ) : (
                <ul className={styles.rows}>
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      {cat.children && cat.children.length > 0 ? (
                        <button
                          type="button"
                          className={styles.row}
                          onClick={() => setOpenParentId(cat.id)}
                        >
                          <span>{cat.label}</span>
                          <ChevronRight />
                        </button>
                      ) : (
                        <Link href={cat.href} className={styles.row} onClick={onClose}>
                          <span>{cat.label}</span>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title={labels.helpServices}>
              <MenuLink href={`/${locale}/pages/contact`} onClick={onClose}>
                {labels.customerService}
              </MenuLink>
              <MenuLink href={locale === 'bn' ? `/${'en'}` : `/${'bn'}`} onClick={onClose}>
                {labels.languageSwitch}
              </MenuLink>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={styles.row} onClick={onClick}>
      <span>{children}</span>
    </Link>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="9 6 15 12 9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="15 6 9 12 15 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}