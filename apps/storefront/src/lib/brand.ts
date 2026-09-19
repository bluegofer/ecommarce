// apps/storefront/src/lib/brand.ts
//
// Single source of truth for brand identity + public URLs.
// Referenced by: root layout metadata, JSON-LD builders, OG image
// generators, PWA install prompt, and any user-facing string that
// must reflect the configured brand.
//
// Rule: NO literal brand string ("BlueGofer") should exist outside
// this file. All other files import BRAND from here.
//
// Related: DECISIONS.md D-02 (brand placeholder, config-driven).

export const BRAND = {
  name: 'BlueGofer',
  nameBn: 'ব্লু-গোফার',
  taglineBn: 'বাংলাদেশে অনলাইন শপিং',
  taglineEn: 'Online Shopping in Bangladesh',

  descriptionBn:
    'BlueGofer — বাংলাদেশের বিশ্বস্ত অনলাইন শপিং প্ল্যাটফর্ম। দ্রুত ডেলিভারি, নিরাপদ পেমেন্ট, সহজ রিটার্ন।',
  descriptionEn:
    'BlueGofer — Bangladesh\u2019s trusted online shopping platform. Fast delivery, safe payments, easy returns.',

  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nolimitshopping.com',
  supportEmail: 'cloud.bluegofer@gmail.com',

  locales: {
    default: 'bn' as const,
    supported: ['bn', 'en'] as const,
  },

  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/apple-touch-icon.svg',
    logo: '/icons/icon.svg',
  },
} as const;

export type BrandLocale = (typeof BRAND.locales.supported)[number];