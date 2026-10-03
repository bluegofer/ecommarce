'use client';

import { useState } from 'react';
import styles from './SeoTextBlock.module.css';

export interface SeoTextBlockProps {
  title: string;
  paragraphs: string[];
  seeMoreLabel: string;
  seeLessLabel: string;
  /** If true, starts expanded (mobile default per UI Spec C1). */
  defaultExpanded?: boolean;
}

export function SeoTextBlock({
  title,
  paragraphs,
  seeMoreLabel,
  seeLessLabel,
  defaultExpanded = false,
}: SeoTextBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (paragraphs.length === 0) return null;

  return (
    <section className={styles.wrap}>
      <h2 className={styles.title}>{title}</h2>
      <div className={[styles.body, expanded ? styles.expanded : ''].filter(Boolean).join(' ')}>
        {paragraphs.map((p, i) => (
          <p key={i} className={styles.paragraph}>{p}</p>
        ))}
      </div>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? seeLessLabel : seeMoreLabel}
      </button>
    </section>
  );
}