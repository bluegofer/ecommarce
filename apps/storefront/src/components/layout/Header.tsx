'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/lib/cart/context';
import { useAuth } from '@/lib/auth/context';
import { MegaMenu, type MegaMenuCategory, type MegaMenuLabels } from './MegaMenu';
import styles from './Header.module.css';

export interface HeaderNavLink {
  label: string;
  href: string;
  opensMegaMenu?: boolean;
  children?: HeaderNavLink[];
}

export interface HeaderLabels {
  deliverTo: string;
  deliverPlaceholder: string;
  searchPlaceholder: string;
  searchAll: string;
  searchIn: string;
  helloSignIn: string;
  accountLists: string;
  returns: string;
  orders: string;
  cart: string;
  languageBn: string;
  languageEn: string;
  megaMenu: MegaMenuLabels;
}

export interface HeaderProps {
  locale: 'bn' | 'en';
  labels: HeaderLabels;
  navLinks: HeaderNavLink[];
  categories: MegaMenuCategory[];
  alternateLocaleHref: string;
  deliverToLabel?: string;
  signedIn?: boolean;
  userName?: string;
  serverCartCount?: number;
}

export function Header({
  locale,
  labels,
  navLinks,
  categories,
  alternateLocaleHref,
  signedIn = false,
  userName,
  serverCartCount = 0,
}: HeaderProps) {
  const { unitCount, hydrated } = useCart();
  const totalCartCount = (hydrated ? unitCount : 0) + serverCartCount;

  const auth = useAuth();

  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    setAccountOpen(false);
    await auth.logout();
    router.push(`/${locale}`);
  }, [auth, locale, router]);
  const isSignedIn = auth.signedIn || signedIn;
  const displayName = auth.user?.fullName || auth.user?.phone || userName;

  const [megaOpen, setMegaOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const accountRef = useRef<HTMLDivElement>(null);
  const navWrapRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > 160);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [accountOpen]);

  useEffect(() => {
    if (!openDropdown) return;
    const onDocClick = (e: MouseEvent) => {
      if (navWrapRef.current && !navWrapRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenDropdown(null); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [openDropdown]);

  const scheduleOpen = (key: string) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setOpenDropdown(key), 120);
  };
  const scheduleClose = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setOpenDropdown(null), 180);
  };

  return (
    <>
      <header className={[styles.header, collapsed ? styles.collapsed : ''].filter(Boolean).join(' ')}>
        <div className={styles.row1}>
          <div className={styles.row1Inner}>
            <button
              type="button"
              className={styles.mobileMenuBtn}
              aria-label={labels.megaMenu.mainMenu}
              onClick={() => setMobileMenuOpen(true)}
            >
              <HamburgerIcon />
            </button>

            <Link href={`/${locale}`} className={styles.logo} aria-label="NoLimitShopping home">
              <PinIcon />
              <span className={styles.logoText}>NoLimitShopping</span>
            </Link>

            <SearchBox
              locale={locale}
              placeholder={labels.searchPlaceholder}
              searchAll={labels.searchAll}
              searchInTemplate={labels.searchIn}
            />

            <Link href={alternateLocaleHref} className={styles.lang}>
              <span className={locale === 'bn' ? styles.langActive : ''}>{labels.languageEn}</span>
              <span className={styles.langSep}>/</span>
              <span className={locale === 'en' ? styles.langActive : ''}>{labels.languageBn}</span>
            </Link>

            <Link
              href={alternateLocaleHref}
              className={styles.langMobile}
              aria-label={locale === 'bn' ? 'Switch to English' : 'Switch to বাংলা'}
            >
              <GlobeIcon />
            </Link>

            <div className={styles.accountWrap} ref={accountRef}>
              <button
                type="button"
                className={styles.account}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((v) => !v)}
              >
                <span className={styles.accountTop}>
                  {isSignedIn && displayName ? `Hello, ${displayName}` : labels.helloSignIn}
                </span>
                <span className={styles.accountBottom}>
                  {labels.accountLists} <ChevronDown />
                </span>
              </button>
              {accountOpen ? (
                <div className={styles.accountMenu} role="menu">
                  {isSignedIn ? (
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.accountMenuItem}
                      onClick={handleSignOut}
                    >
                      Sign out
                    </button>
                  ) : (
                    <Link href={`/${locale}/signin`} role="menuitem">
                      Sign In
                    </Link>
                  )}
                  <Link href={`/${locale}/register`} role="menuitem">
                    {isSignedIn ? 'Switch account' : 'Register'}
                  </Link>
                  <Link href={`/${locale}/account`} role="menuitem">
                    {labels.accountLists}
                  </Link>
                  <Link href={`/${locale}/account/orders`} role="menuitem">
                    {labels.orders}
                  </Link>
                  <Link href={`/${locale}/account/wishlist`} role="menuitem">
                    Wishlist
                  </Link>
                  <Link href={`/${locale}/account/returns`} role="menuitem">
                    {labels.returns}
                  </Link>
                </div>
              ) : null}
            </div>

            <Link href={`/${locale}/account/orders`} className={styles.orders}>
              <span className={styles.ordersTop}>{labels.returns}</span>
              <span className={styles.ordersBottom}>{labels.orders}</span>
            </Link>

            <Link href={`/${locale}/cart`} className={styles.cart} aria-label={labels.cart}>
              <span className={styles.cartIconWrap}>
                <CartIcon />
                <span className={styles.cartBadge} aria-live="polite">
                  {totalCartCount}
                </span>
              </span>
              <span className={styles.cartText}>{labels.cart}</span>
            </Link>
          </div>
        </div>

        <div className={styles.row2}>
          <div className={styles.row2Inner} ref={navWrapRef}>
            <button
              type="button"
              className={styles.allBtn}
              onClick={() => setMegaOpen(true)}
              aria-haspopup="dialog"
            >
              <HamburgerIcon />
              <span>{labels.megaMenu.mainMenu}</span>
            </button>
            <nav className={styles.navLinks} aria-label="Primary">
              {navLinks.map((link) => {
                const key = `nav-${link.href}-${link.label}`;
                if (link.opensMegaMenu) {
                  return (
                    <button
                      key={key}
                      type="button"
                      className={styles.navLink}
                      onClick={() => setMegaOpen(true)}
                    >
                      {link.label}
                    </button>
                  );
                }
                if (link.children && link.children.length > 0) {
                  // Step-94: click-based dropdown
                  const open = openDropdown === key;
                  return (
                    <div key={key} className={styles.navItemWrap}>
                      <button
                        type="button"
                        className={[styles.navLink, open ? styles.navLinkOpen : ''].filter(Boolean).join(' ')}
                        aria-haspopup="menu"
                        aria-expanded={open}
                        onClick={() => setOpenDropdown(open ? null : key)}
                      >
                        {link.label}
                        <span className={styles.navCaret} aria-hidden="true">
                          <ChevronDown />
                        </span>
                      </button>
                      {open ? (
                        <div className={styles.dropdownPanel} role="menu">
                          {link.children.map((child) => (
                            <Link
                              key={`${key}-${child.href}-${child.label}`}
                              href={child.href}
                              role="menuitem"
                              className={styles.dropdownLink}
                              onClick={() => setOpenDropdown(null)}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                }
                return (
                  <Link key={key} href={link.href} className={styles.navLink}>
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className={styles.chips}>
          <div className={styles.chipsInner}>
            <button
              type="button"
              className={styles.chip}
              onClick={() => setMegaOpen(true)}
            >
              {labels.megaMenu.mainMenu}
            </button>
            {navLinks.slice(0, 4).map((link) => (
              <Link key={`chip-${link.href}-${link.label}`} href={link.href} className={styles.chip}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <MegaMenu
        open={megaOpen || mobileMenuOpen}
        onClose={() => { setMegaOpen(false); setMobileMenuOpen(false); }}
        locale={locale}
        categories={categories}
        labels={labels.megaMenu}
        signedIn={isSignedIn}
        userName={displayName}
      />
    </>
  );
}

function SearchBox({
  locale,
  placeholder,
  searchAll,
  searchInTemplate,
}: {
  locale: 'bn' | 'en';
  placeholder: string;
  searchAll: string;
  searchInTemplate: string;
}) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState('');
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), 250);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const suggestions = debounced.length >= 2
    ? [
        { text: `${debounced} headphones`, href: `/${locale}/s?k=${encodeURIComponent(debounced + ' headphones')}` },
        { text: `${debounced} wireless`,   href: `/${locale}/s?k=${encodeURIComponent(debounced + ' wireless')}` },
        { text: `${debounced} 2026`,       href: `/${locale}/s?k=${encodeURIComponent(debounced + ' 2026')}` },
      ]
    : [];

  const submit = (q: string) => {
    if (!q) return;
    window.location.href = `/${locale}/s?k=${encodeURIComponent(q)}`;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = activeIdx >= 0 ? suggestions[activeIdx] : null;
      if (chosen) window.location.href = chosen.href;
      else submit(value.trim());
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={styles.search} ref={wrapRef} suppressHydrationWarning>
      <div className={styles.searchBar}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder={placeholder}
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); setActiveIdx(-1); }}
          onFocus={() => value.length >= 2 && setOpen(true)}
          onKeyDown={onKeyDown}
          aria-autocomplete="list"
          role="combobox"
          aria-controls="search-suggestions"
          aria-expanded={open}
        />
        <button type="button" className={styles.searchSubmit} onClick={() => submit(value.trim())} aria-label="Search">
          <SearchIcon />
        </button>
      </div>

      {open && suggestions.length > 0 ? (
        <div className={styles.suggestions} role="listbox" id="search-suggestions">
          {suggestions.map((s, i) => (
            <Link
              key={s.href}
              href={s.href}
              role="option"
              aria-selected={i === activeIdx}
              className={[styles.suggestion, i === activeIdx ? styles.suggestionActive : ''].filter(Boolean).join(' ')}
            >
              <SearchIcon />
              <span>{s.text}</span>
            </Link>
          ))}
          <Link
            href={`/${locale}/s?k=${encodeURIComponent(value.trim())}`}
            className={styles.suggestionAll}
          >
            {searchInTemplate.replace('{q}', value.trim()).replace('{category}', searchAll)}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function PinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22s8-6.5 8-12a8 8 0 10-16 0c0 5.5 8 12 8 12z" fill="var(--sk-brand-300)" />
      <circle cx="12" cy="10" r="3" fill="var(--sk-brand-950)" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 4h2l2.4 11.2a2 2 0 002 1.6h7.8a2 2 0 002-1.6L21 8H6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="20" r="1.4" fill="currentColor" />
      <circle cx="17.5" cy="20" r="1.4" fill="currentColor" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
