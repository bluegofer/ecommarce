import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  illustration?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ illustration, title, body, action, className }: EmptyStateProps) {
  const cls = [styles.wrap, className].filter(Boolean).join(' ');
  return (
    <div className={cls} role="status">
      <div className={styles.illustration}>{illustration}</div>
      <h3 className={styles.title}>{title}</h3>
      {body ? <p className={styles.body}>{body}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}