'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { trapFocus, lockBodyScroll } from '@/lib/a11y/focus-trap';
import styles from './Modal.module.css';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Accessible label for the dialog. */
  ariaLabel: string;
  /** Max width per UI Spec B6: 480 (forms) or 720 (media). */
  size?: 'form' | 'media';
  /** Optional header title (16px semibold). */
  title?: string;
  /** Optional footer slot (buttons etc.). */
  footer?: ReactNode;
  /** Main content. */
  children: ReactNode;
  /** Set false to prevent Esc / scrim click closing (e.g. during submit). */
  dismissible?: boolean;
}

export function Modal({
  open,
  onClose,
  ariaLabel,
  size = 'form',
  title,
  footer,
  children,
  dismissible = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const unlock = lockBodyScroll();
    const trap = trapFocus(dialog);
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

  const content = (
    <div className={styles.scrim} onMouseDown={(e) => { if (dismissible && e.target === e.currentTarget) onClose(); }}>
      <div
        ref={dialogRef}
        className={[styles.dialog, size === 'media' ? styles.sizeMedia : styles.sizeForm].join(' ')}
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
        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}