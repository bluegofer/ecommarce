'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { CmsMenuDto, CmsMenuItemDto } from '@ecommarce/types';

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
// Inline SVG icons
// ─────────────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
  const slug: string = slugFromUrl || item.id;
  const label: string = item.labelEn;
  return {
    slug,
    label,
    children: (item.children ?? []).map(cmsToCategory),
  };
}

function deriveSlugFromUrl(url: string): string {
  if (!url) return '';
  const catMatch = url.match(/\/c\/([^/?#]+)/);
  if (catMatch && catMatch[1]) return catMatch[1];
  const clean = url.replace(/^\/+/, '').replace(/\//g, '-');
  return clean;
}

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
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label={labels.mainMenu}
    >
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="relative w-full max-w-[380px] h-full bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
          <div className="text-base font-semibold text-slate-900">{labels.mainMenu}</div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded hover:bg-slate-100 text-slate-600"
            aria-label="Close menu"
          >
            <XIcon />
          </button>
        </div>

        {signedIn && (
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 text-[13px] text-slate-700">
            {labels.greeting ?? labels.hello ?? 'Hello'}
            {userName ? (
              <>
                , <span className="font-semibold">{userName}</span>
              </>
            ) : null}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {labels.trending && (
            <Section title={labels.trending}>
              <SimpleLink
                href={`/${locale}/deals`}
                label={labels.todaysDeals ?? "Today's Deals"}
              />
              <SimpleLink
                href={`/${locale}/s?sort=best-sellers`}
                label={labels.bestSellers ?? 'Best Sellers'}
              />
              <SimpleLink
                href={`/${locale}/s?sort=newest`}
                label={labels.newArrivals ?? 'New Arrivals'}
              />
            </Section>
          )}

          {labels.shopByCategory && (
            <Section title={labels.shopByCategory}>
              {shopByCategoryItems.length === 0 ? (
                <p className="text-[12.5px] text-slate-400 py-1">No categories yet.</p>
              ) : (
                shopByCategoryItems.map((cat) => (
                  <CategoryAccordion
                    key={cat.slug}
                    category={cat}
                    locale={locale}
                    expanded={expanded}
                    onToggle={toggle}
                    level={0}
                  />
                ))
              )}
            </Section>
          )}

          {labels.helpAndServices && (
            <Section title={labels.helpAndServices}>
              {labels.customerService && (
                <SimpleLink
                  href={`/${locale}/pages/contact`}
                  label={labels.customerService}
                />
              )}
              <SimpleLink
                href={`/${locale}/account/orders`}
                label={labels.orders ?? 'Your Orders'}
              />
              <SimpleLink href={`/${locale}/pages/faq`} label="FAQ" />
            </Section>
          )}
        </div>

        <div className="border-t border-slate-200 px-4 py-3 shrink-0">
          {signedIn ? (
            <Link
              href={`/${locale}/account`}
              className="block w-full text-center py-2.5 rounded bg-slate-100 text-slate-800 text-sm font-medium hover:bg-slate-200"
              onClick={onClose}
            >
              My Account
            </Link>
          ) : (
            <Link
              href={`/${locale}/signin`}
              className="block w-full text-center py-2.5 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
              onClick={onClose}
            >
              {labels.signIn ?? 'Sign In'}
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3 border-b border-slate-100 last:border-b-0">
      <div className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase mb-2">
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function SimpleLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="block py-2 text-[14px] text-slate-700 hover:text-sky-700">
      {label}
    </Link>
  );
}

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
      <Link
        href={`/${locale}/c/${category.slug}`}
        className="block py-2 text-[14px] text-slate-700 hover:text-sky-700"
        style={{ paddingLeft: level * 14 }}
      >
        {category.label}
      </Link>
    );
  }

  return (
    <div>
      <div
        className="flex items-center justify-between py-2 text-[14px] text-slate-700 hover:text-sky-700"
        style={{ paddingLeft: level * 14 }}
      >
        <Link href={`/${locale}/c/${category.slug}`} className="flex-1 truncate">
          {category.label}
        </Link>
        <button
          type="button"
          onClick={() => onToggle(category.slug)}
          className="p-1 rounded hover:bg-slate-100 text-slate-500"
          aria-label={isOpen ? 'Collapse' : 'Expand'}
        >
          {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </button>
      </div>
      {isOpen && (
        <div className="border-l border-slate-100 ml-3">
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
        </div>
      )}
    </div>
  );
}