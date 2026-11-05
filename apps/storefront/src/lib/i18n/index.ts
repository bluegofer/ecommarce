import bn from './bn.json';
import en from './en.json';

export const LOCALES = ['bn', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'bn';

export type Dictionary = typeof bn;

const dictionaries: Record<Locale, Dictionary> = {
  bn: bn as Dictionary,
  en: en as Dictionary,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/**
 * Interpolate {name} placeholders in a string.
 *   t('product.low_stock', { n: 3 })  → "Only 3 left" / "মাত্র ৩টি বাকি"
 */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = vars[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}