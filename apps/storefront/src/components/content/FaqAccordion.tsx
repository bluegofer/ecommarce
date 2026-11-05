'use client';

import { useMemo, useState } from 'react';
import styles from './FaqAccordion.module.css';

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface FaqAccordionLabels {
  searchPlaceholder: string;
  noResults: string;
  helpful: string;
}

export interface FaqAccordionProps {
  items: FaqItem[];
  labels: FaqAccordionLabels;
}

export function FaqAccordion({ items, labels }: FaqAccordionProps) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const needle = q.trim().toLowerCase();
    return items.filter(
      (it) =>
        it.question.toLowerCase().includes(needle) ||
        it.answer.toLowerCase().includes(needle),
    );
  }, [items, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, FaqItem[]>();
    for (const it of filtered) {
      const list = map.get(it.category) ?? [];
      list.push(it);
      map.set(it.category, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.searchWrap}>
        <input
          type="search"
          className={styles.search}
          placeholder={labels.searchPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={labels.searchPlaceholder}
        />
      </div>

      {grouped.length === 0 ? (
        <p className={styles.empty}>{labels.noResults}</p>
      ) : (
        grouped.map(([category, list]) => (
          <section key={category} className={styles.group}>
            <h2 className={styles.groupTitle}>{category}</h2>
            <ul className={styles.list}>
              {list.map((it) => {
                const isOpen = open.has(it.id);
                return (
                  <li key={it.id} className={styles.item}>
                    <button
                      type="button"
                      className={[styles.qBtn, isOpen ? styles.qOpen : ''].filter(Boolean).join(' ')}
                      onClick={() => toggle(it.id)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-${it.id}`}
                    >
                      <span className={styles.qText}>{it.question}</span>
                      <span className={[styles.chev, isOpen ? styles.chevOpen : ''].filter(Boolean).join(' ')} aria-hidden="true">
                        ▾
                      </span>
                    </button>
                    {isOpen ? (
                      <div id={`faq-${it.id}`} className={styles.aWrap}>
                        <p className={styles.aText}>{it.answer}</p>
                        <div className={styles.helpRow}>
                          <span className={styles.helpText}>{labels.helpful}</span>
                          <button type="button" className={styles.helpBtn} aria-label="Yes">👍</button>
                          <button type="button" className={styles.helpBtn} aria-label="No">👎</button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}