/**
 * Money formatting — TDD §11.4: all money is integer poisha.
 * 1 BDT = 100 poisha. Display uses Western digits + ৳ prefix (UI Spec A3).
 */

const BDT_SYMBOL = '\u09F3'; // ৳

/** Format poisha as "৳1,299" (no decimals when whole taka). */
export function formatPoisha(poisha: number): string {
  const taka = poisha / 100;
  const hasFraction = poisha % 100 !== 0;
  const formatted = hasFraction
    ? taka.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : taka.toLocaleString('en-US');
  return `${BDT_SYMBOL}${formatted}`;
}

/** Format poisha for aria/screen-reader: "1299 taka" */
export function formatPoishaAria(poisha: number): string {
  return `${(poisha / 100).toLocaleString('en-US')} taka`;
}

/** Compute savings percentage: (list - current) / list * 100, rounded down. */
export function savingsPercent(currentPoisha: number, listPoisha: number): number {
  if (listPoisha <= 0 || currentPoisha >= listPoisha) return 0;
  return Math.floor(((listPoisha - currentPoisha) / listPoisha) * 100);
}

/** Savings amount in poisha. */
export function savingsPoisha(currentPoisha: number, listPoisha: number): number {
  return Math.max(0, listPoisha - currentPoisha);
}