'use client';

import { useEffect, useState } from 'react';
import styles from './StickyTabs.module.css';

export interface Tab {
  id: string;
  label: string;
}

export interface StickyTabsProps {
  tabs: Tab[];
  /** Initial active tab. Defaults to first. */
  defaultActive?: string;
}

/**
 * Sticky tab bar under header — click scrolls to section, scroll-spy highlights.
 * Sections must have ids matching tab.id.
 */
export function StickyTabs({ tabs, defaultActive }: StickyTabsProps) {
  const [active, setActive] = useState(defaultActive ?? tabs[0]?.id);

  useEffect(() => {
    if (tabs.length === 0) return;

    const onScroll = () => {
      const y = window.scrollY + 160; // offset for sticky header
      let current = tabs[0]!.id;
      for (const tab of tabs) {
        const el = document.getElementById(tab.id);
        if (el && el.offsetTop <= y) current = tab.id;
      }
      setActive(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [tabs]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <nav className={styles.bar} aria-label="Product sections">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={[styles.tab, active === t.id ? styles.active : ''].filter(Boolean).join(' ')}
          onClick={() => handleClick(t.id)}
          aria-current={active === t.id}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}