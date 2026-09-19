/**
 * Money helpers — ALL money is integer minor units (poisha) per TDD section 11.4.
 * Never use floating-point arithmetic on money.
 *
 * 1 BDT = 100 poisha.
 */

export const POISHA_PER_TAKA = 100;

/** Convert taka (possibly fractional) to integer poisha. */
export function toPoisha(taka: number | string): number {
  const n = typeof taka === 'string' ? Number(taka) : taka;
  if (!Number.isFinite(n)) throw new Error(`Invalid taka amount: ${taka}`);
  return Math.round(n * POISHA_PER_TAKA);
}

/** Convert integer poisha to taka number (for display only; may be fractional). */
export function toTaka(poisha: number): number {
  if (!Number.isInteger(poisha)) throw new Error(`Poisha must be an integer: ${poisha}`);
  return poisha / POISHA_PER_TAKA;
}

/** Format poisha as a display string, e.g. "৳1,299.00". */
export function formatPoisha(poisha: number, currency = 'BDT'): string {
  if (!Number.isInteger(poisha)) throw new Error(`Poisha must be an integer: ${poisha}`);
  const taka = poisha / POISHA_PER_TAKA;
  const formatted = taka.toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency === 'BDT' ? '৳' : currency}${formatted}`;
}

/** Sum integer poisha values safely. */
export function sumPoisha(...values: number[]): number {
  return values.reduce((acc, v) => {
    if (!Number.isInteger(v)) throw new Error(`Non-integer poisha: ${v}`);
    return acc + v;
  }, 0);
}

/** Apply a percentage discount (0-100) to poisha, rounding down (favours customer). */
export function applyPercentDiscount(poisha: number, percent: number): number {
  if (percent < 0 || percent > 100) throw new Error(`Percent out of range: ${percent}`);
  return Math.floor((poisha * (100 - percent)) / 100);
}

/** Compute discount amount for a percentage off (rounds down). */
export function percentDiscountAmount(poisha: number, percent: number): number {
  if (percent < 0 || percent > 100) throw new Error(`Percent out of range: ${percent}`);
  return Math.floor((poisha * percent) / 100);
}

/** Safe subtraction — rejects negative result unless explicitly allowed. */
export function subPoisha(a: number, b: number, allowNegative = false): number {
  const result = a - b;
  if (!allowNegative && result < 0) throw new Error(`Poisha underflow: ${a} - ${b}`);
  return result;
}