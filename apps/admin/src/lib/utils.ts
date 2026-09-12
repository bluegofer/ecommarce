import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes safely — later classes win, conflicts resolved.
 * Usage: <div className={cn('p-2', isActive && 'bg-sky-100')} />
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format integer poisha (BDT minor unit) → "৳1,234.56" string.
 * All money in the platform is integer poisha per D-17.
 */
export function formatPoisha(poisha: number, withSymbol = true): string {
  const taka = poisha / 100;
  const formatted = new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(taka);
  return withSymbol ? `৳${formatted}` : formatted;
}

/**
 * Format a Date → "12 Sep 2026, 10:53 PM" (en-BD locale).
 */
export function formatDateTime(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return new Intl.DateTimeFormat('en-BD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Format a Date → "12 Sep 2026".
 */
export function formatDate(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return new Intl.DateTimeFormat('en-BD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}