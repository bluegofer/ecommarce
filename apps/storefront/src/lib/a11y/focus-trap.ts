/**
 * Minimal focus trap for modals and drawers (UI Spec B6).
 * - Captures Tab/Shift+Tab, wraps focus within the container
 * - Returns cleanup that restores focus to the previously focused element
 * - Does NOT manage aria-hidden / scrim; caller does that
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) =>
      !el.hasAttribute('inert') &&
      el.offsetParent !== null && // visible
      getComputedStyle(el).visibility !== 'hidden',
  );
}

export interface FocusTrapHandle {
  /** Move focus to the first focusable element inside the container. */
  focusFirst: () => void;
  /** Restore focus to the element that was active before the trap engaged. */
  release: () => void;
}

export function trapFocus(container: HTMLElement): FocusTrapHandle {
  const previouslyFocused = document.activeElement as HTMLElement | null;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusable = getFocusable(container);
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    const active = document.activeElement as HTMLElement | null;

    if (e.shiftKey) {
      if (active === first || active === container || !container.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last || !container.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  document.addEventListener('keydown', onKeyDown, true);

  const focusFirst = () => {
    const focusable = getFocusable(container);
    const target = focusable[0] ?? container;
    target.focus();
  };

  const release = () => {
    document.removeEventListener('keydown', onKeyDown, true);
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus();
    }
  };

  return { focusFirst, release };
}

/** Lock body scroll while a modal/drawer is open. */
export function lockBodyScroll(): () => void {
  const original = document.body.style.overflow;
  const originalPaddingRight = document.body.style.paddingRight;
  // Compensate for scrollbar width to prevent layout shift
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.overflow = 'hidden';
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
  return () => {
    document.body.style.overflow = original;
    document.body.style.paddingRight = originalPaddingRight;
  };
}