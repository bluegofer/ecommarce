import type { CSSProperties } from 'react';
import styles from './Pagination.module.css';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  labelPageOf?: (page: number, total: number) => string;
  className?: string;
  style?: CSSProperties;
}

function pageWindow(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'gap')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('gap');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('gap');
  pages.push(total);
  return pages;
}

export function Pagination({ page, totalPages, onPageChange, labelPageOf, className, style }: PaginationProps) {
  if (totalPages <= 1) return null;
  const cls = [styles.wrap, className].filter(Boolean).join(' ');
  const pages = pageWindow(page, totalPages);
  const caption = labelPageOf ? labelPageOf(page, totalPages) : `Page ${page} of ${totalPages}`;
  return (
    <nav className={cls} style={style} aria-label="Pagination">
      <button type="button" className={styles.pill} onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page">‹</button>
      {pages.map((p, idx) =>
        p === 'gap' ? (
          <span key={`gap-${idx}`} className={styles.gap} aria-hidden="true">…</span>
        ) : (
          <button key={p} type="button" className={[styles.pill, p === page ? styles.current : ''].filter(Boolean).join(' ')} onClick={() => onPageChange(p)} aria-current={p === page ? 'page' : undefined}>{p}</button>
        ),
      )}
      <button type="button" className={styles.pill} onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} aria-label="Next page">›</button>
      <span className={styles.caption}>{caption}</span>
    </nav>
  );
}