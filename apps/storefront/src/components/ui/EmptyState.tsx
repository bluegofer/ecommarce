'use client';

import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  illustration?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
  /** Heading level for the title. Defaults to 3. Set to 1 or 2 on top-level
   *  empty pages (cart, 404) to keep document heading order valid. */
  headingLevel?: 1 | 2 | 3 | 4;
}

export function EmptyState({
  illustration,
  title,
  body,
  action,
  className,
  headingLevel = 3,
}: EmptyStateProps) {
  const cls = [styles.wrap, className].filter(Boolean).join(' ');
  const HeadingTag = `h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4';

  return (
    <div className={cls} role="status">
      <div className={styles.illustration}>{illustration}</div>
      <HeadingTag className={styles.title}>{title}</HeadingTag>
      {body ? <p className={styles.body}>{body}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}