/**
 * Slugify — convert any string to a URL-safe slug.
 * Handles Bangla + English; Bangla characters are transliterated is out-of-scope here,
 * so Bangla-only titles fall back to a short hash suffix.
 */

export function slugify(input: string): string {
  const ascii = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (ascii.length >= 2) return ascii;

  // Bangla or other non-ASCII input — produce a stable short slug
  const hash = simpleHash(input).toString(36).slice(0, 8);
  return `item-${hash}`;
}

/** Deterministic 32-bit hash — used only for slug fallback, not security. */
export function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Ensure a slug is unique by appending a numeric suffix. */
export function uniqueSlug(base: string, exists: (slug: string) => boolean): string {
  if (!exists(base)) return base;
  let n = 2;
  while (exists(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}