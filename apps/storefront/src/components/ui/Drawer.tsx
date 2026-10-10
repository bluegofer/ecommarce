'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { trapFocus, lockBodyScroll } from '@/lib/a11y/focus-trap';
import styles from './Drawer.module.css';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  /** Side of the viewport. Default right (UI Spec B6). */
  side?: 'left' | 'right' | 'bottom';
  /** Width for left/right; height for bottom. 400 = default, 320 = filters tablet. */
  width?: number;
  title?: string;
  children: ReactNode;
  dismissible?: boolean;
}

export function Drawer({
  open,
  onClose,
  ariaLabel,
  side = 'right',
  width = 400,
  title,
  children,
  dismissible = true,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const unlock = lockBodyScroll();
    const trap = trapFocus(panel);
    trap.focusFirst();

    const onKey = (e: KeyboardEvent) => {
      if (dismissible && e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      trap.release();
      unlock();
    };
  }, [open, dismissible, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const panelStyle =
    side === 'bottom'
      ? { height: width === 400 ? '85vh' : `${width}px` }
      : { width: `${width}px` };

  const content = (
    <div
      className={styles.scrim}
      onMouseDown={(e) => { if (dismissible && e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        className={[styles.panel, styles[side]].join(' ')}
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
      >
        {(title || dismissible) && (
          <div className={styles.header}>
            {title ? <h2 className={styles.title}>{title}</h2> : <span />}
            {dismissible && (
              <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}