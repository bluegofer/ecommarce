// packages/types/src/countries.ts
//
// Shared country list for international phone support.
// Used by both storefront (CountrySelector + PhoneInput) and API
// (RegisterDto / OtpDto validation).
//
// Only countries with reliable mobile number formats included here.
// Extend as needed. Dial code stored WITHOUT the leading '+' — the
// composer adds '+' to build E.164 for storage.

export interface Country {
  /** ISO 3166-1 alpha-2 (e.g. "BD", "US", "IN"). */
  code: string;
  /** English display name. */
  nameEn: string;
  /** Bengali display name. */
  nameBn: string;
  /** Dial code WITHOUT '+' (e.g. "880", "1", "91"). */
  dialCode: string;
  /** Flag emoji. */
  flag: string;
  /**
   * National-number regex (WITHOUT the dial code, WITHOUT leading '0').
   * Matches the raw local number the user types after the dial code.
   */
  nationalRegex: string;
  /** Max digits in the national part (input maxLength hint). */
  nationalMaxLength: number;
  /** Placeholder sample digits (national part only). */
  exampleLocal: string;
}

/**
 * Primary launch countries (BD focus, then common e-commerce destinations).
 * Order matters: BD first = default in selectors.
 */
export const COUNTRIES: Country[] = [
  {
    code: 'BD',
    nameEn: 'Bangladesh',
    nameBn: 'বাংলাদেশ',
    dialCode: '880',
    flag: '🇧🇩',
    nationalRegex: '1[3-9]\\d{8}',
    nationalMaxLength: 10,
    exampleLocal: '1715141764',
  },
  {
    code: 'IN',
    nameEn: 'India',
    nameBn: 'ভারত',
    dialCode: '91',
    flag: '🇮🇳',
    nationalRegex: '[6-9]\\d{9}',
    nationalMaxLength: 10,
    exampleLocal: '9876543210',
  },
  {
    code: 'PK',
    nameEn: 'Pakistan',
    nameBn: 'পাকিস্তান',
    dialCode: '92',
    flag: '🇵🇰',
    nationalRegex: '3\\d{9}',
    nationalMaxLength: 10,
    exampleLocal: '3001234567',
  },
  {
    code: 'NP',
    nameEn: 'Nepal',
    nameBn: 'নেপাল',
    dialCode: '977',
    flag: '🇳🇵',
    nationalRegex: '98\\d{8}',
    nationalMaxLength: 10,
    exampleLocal: '9812345678',
  },
  {
    code: 'LK',
    nameEn: 'Sri Lanka',
    nameBn: 'শ্রীলঙ্কা',
    dialCode: '94',
    flag: '🇱🇰',
    nationalRegex: '7\\d{8}',
    nationalMaxLength: 9,
    exampleLocal: '712345678',
  },
  {
    code: 'US',
    nameEn: 'United States',
    nameBn: 'যুক্তরাষ্ট্র',
    dialCode: '1',
    flag: '🇺🇸',
    nationalRegex: '[2-9]\\d{9}',
    nationalMaxLength: 10,
    exampleLocal: '4155551234',
  },
  {
    code: 'CA',
    nameEn: 'Canada',
    nameBn: 'কানাডা',
    dialCode: '1',
    flag: '🇨🇦',
    nationalRegex: '[2-9]\\d{9}',
    nationalMaxLength: 10,
    exampleLocal: '4165551234',
  },
  {
    code: 'GB',
    nameEn: 'United Kingdom',
    nameBn: 'যুক্তরাজ্য',
    dialCode: '44',
    flag: '🇬🇧',
    nationalRegex: '7\\d{9}',
    nationalMaxLength: 10,
    exampleLocal: '7400123456',
  },
  {
    code: 'AE',
    nameEn: 'United Arab Emirates',
    nameBn: 'সংযুক্ত আরব আমিরাত',
    dialCode: '971',
    flag: '🇦🇪',
    nationalRegex: '5\\d{8}',
    nationalMaxLength: 9,
    exampleLocal: '501234567',
  },
  {
    code: 'SA',
    nameEn: 'Saudi Arabia',
    nameBn: 'সৌদি আরব',
    dialCode: '966',
    flag: '🇸🇦',
    nationalRegex: '5\\d{8}',
    nationalMaxLength: 9,
    exampleLocal: '501234567',
  },
  {
    code: 'QA',
    nameEn: 'Qatar',
    nameBn: 'কাতার',
    dialCode: '974',
    flag: '🇶🇦',
    nationalRegex: '[3-7]\\d{7}',
    nationalMaxLength: 8,
    exampleLocal: '33123456',
  },
  {
    code: 'KW',
    nameEn: 'Kuwait',
    nameBn: 'কুয়েত',
    dialCode: '965',
    flag: '🇰🇼',
    nationalRegex: '[5-9]\\d{7}',
    nationalMaxLength: 8,
    exampleLocal: '51234567',
  },
  {
    code: 'MY',
    nameEn: 'Malaysia',
    nameBn: 'মালয়েশিয়া',
    dialCode: '60',
    flag: '🇲🇾',
    nationalRegex: '1\\d{8,9}',
    nationalMaxLength: 10,
    exampleLocal: '123456789',
  },
  {
    code: 'SG',
    nameEn: 'Singapore',
    nameBn: 'সিঙ্গাপুর',
    dialCode: '65',
    flag: '🇸🇬',
    nationalRegex: '[89]\\d{7}',
    nationalMaxLength: 8,
    exampleLocal: '81234567',
  },
  {
    code: 'AU',
    nameEn: 'Australia',
    nameBn: 'অস্ট্রেলিয়া',
    dialCode: '61',
    flag: '🇦🇺',
    nationalRegex: '4\\d{8}',
    nationalMaxLength: 9,
    exampleLocal: '412345678',
  },
  {
    code: 'IT',
    nameEn: 'Italy',
    nameBn: 'ইতালি',
    dialCode: '39',
    flag: '🇮🇹',
    nationalRegex: '3\\d{8,9}',
    nationalMaxLength: 10,
    exampleLocal: '3123456789',
  },
  {
    code: 'DE',
    nameEn: 'Germany',
    nameBn: 'জার্মানি',
    dialCode: '49',
    flag: '🇩🇪',
    nationalRegex: '1[5-7]\\d{8,9}',
    nationalMaxLength: 11,
    exampleLocal: '15112345678',
  },
  {
    code: 'FR',
    nameEn: 'France',
    nameBn: 'ফ্রান্স',
    dialCode: '33',
    flag: '🇫🇷',
    nationalRegex: '[67]\\d{8}',
    nationalMaxLength: 9,
    exampleLocal: '612345678',
  },
  {
    code: 'JP',
    nameEn: 'Japan',
    nameBn: 'জাপান',
    dialCode: '81',
    flag: '🇯🇵',
    nationalRegex: '[7-9]0\\d{8}',
    nationalMaxLength: 10,
    exampleLocal: '9012345678',
  },
  {
    code: 'KR',
    nameEn: 'South Korea',
    nameBn: 'দক্ষিণ কোরিয়া',
    dialCode: '82',
    flag: '🇰🇷',
    nationalRegex: '1[0-9]\\d{7,8}',
    nationalMaxLength: 10,
    exampleLocal: '1012345678',
  },
  {
    code: 'AM',
    nameEn: 'Armenia',
    nameBn: 'আর্মেনিয়া',
    dialCode: '374',
    flag: '🇦🇲',
    nationalRegex: '[4-9]\\d{7}',
    nationalMaxLength: 8,
    exampleLocal: '77123456',
  },
  {
    code: 'BH',
    nameEn: 'Bahrain',
    nameBn: 'বাহরাইন',
    dialCode: '973',
    flag: '🇧🇭',
    nationalRegex: '3\\d{7}',
    nationalMaxLength: 8,
    exampleLocal: '36123456',
  },
  {
    code: 'OM',
    nameEn: 'Oman',
    nameBn: 'ওমান',
    dialCode: '968',
    flag: '🇴🇲',
    nationalRegex: '[79]\\d{7}',
    nationalMaxLength: 8,
    exampleLocal: '91234567',
  },
  {
    code: 'JO',
    nameEn: 'Jordan',
    nameBn: 'জর্ডান',
    dialCode: '962',
    flag: '🇯🇴',
    nationalRegex: '7\\d{8}',
    nationalMaxLength: 9,
    exampleLocal: '791234567',
  },
  {
    code: 'LB',
    nameEn: 'Lebanon',
    nameBn: 'লেবানন',
    dialCode: '961',
    flag: '🇱🇧',
    nationalRegex: '\\d{7,8}',
    nationalMaxLength: 8,
    exampleLocal: '71123456',
  },
  {
    code: 'IQ',
    nameEn: 'Iraq',
    nameBn: 'ইরাক',
    dialCode: '964',
    flag: '🇮🇶',
    nationalRegex: '7\\d{9}',
    nationalMaxLength: 10,
    exampleLocal: '7912345678',
  },
  {
    code: 'IR',
    nameEn: 'Iran',
    nameBn: 'ইরান',
    dialCode: '98',
    flag: '🇮🇷',
    nationalRegex: '9\\d{9}',
    nationalMaxLength: 10,
    exampleLocal: '9123456789',
  },
  {
    code: 'IL',
    nameEn: 'Israel',
    nameBn: 'ইসরায়েল',
    dialCode: '972',
    flag: '🇮🇱',
    nationalRegex: '5\\d{8}',
    nationalMaxLength: 9,
    exampleLocal: '501234567',
  },
  {
    code: 'TR',
    nameEn: 'Turkey',
    nameBn: 'তুরস্ক',
    dialCode: '90',
    flag: '🇹🇷',
    nationalRegex: '5\\d{9}',
    nationalMaxLength: 10,
    exampleLocal: '5012345678',
  },
  {
    code: 'EG',
    nameEn: 'Egypt',
    nameBn: 'মিশর',
    dialCode: '20',
    flag: '🇪🇬',
    nationalRegex: '1\\d{9}',
    nationalMaxLength: 10,
    exampleLocal: '1001234567',
  },
  {
    code: 'ES',
    nameEn: 'Spain',
    nameBn: 'স্পেন',
    dialCode: '34',
    flag: '🇪🇸',
    nationalRegex: '[67]\\d{8}',
    nationalMaxLength: 9,
    exampleLocal: '612345678',
  },
  {
    code: 'NL',
    nameEn: 'Netherlands',
    nameBn: 'নেদারল্যান্ডস',
    dialCode: '31',
    flag: '🇳🇱',
    nationalRegex: '6\\d{8}',
    nationalMaxLength: 9,
    exampleLocal: '612345678',
  },
  {
    code: 'BE',
    nameEn: 'Belgium',
    nameBn: 'বেলজিয়াম',
    dialCode: '32',
    flag: '🇧🇪',
    nationalRegex: '4\\d{8}',
    nationalMaxLength: 9,
    exampleLocal: '412345678',
  },
  {
    code: 'PT',
    nameEn: 'Portugal',
    nameBn: 'পর্তুগাল',
    dialCode: '351',
    flag: '🇵🇹',
    nationalRegex: '9\\d{8}',
    nationalMaxLength: 9,
    exampleLocal: '912345678',
  },
  {
    code: 'PL',
    nameEn: 'Poland',
    nameBn: 'পোল্যান্ড',
    dialCode: '48',
    flag: '🇵🇱',
    nationalRegex: '\\d{9}',
    nationalMaxLength: 9,
    exampleLocal: '512345678',
  },
  {
    code: 'SE',
    nameEn: 'Sweden',
    nameBn: 'সুইডেন',
    dialCode: '46',
    flag: '🇸🇪',
    nationalRegex: '7\\d{8}',
    nationalMaxLength: 9,
    exampleLocal: '701234567',
  },
  {
    code: 'NO',
    nameEn: 'Norway',
    nameBn: 'নরওয়ে',
    dialCode: '47',
    flag: '🇳🇴',
    nationalRegex: '[49]\\d{7}',
    nationalMaxLength: 8,
    exampleLocal: '40123456',
  },
  {
    code: 'DK',
    nameEn: 'Denmark',
    nameBn: 'ডেনমার্ক',
    dialCode: '45',
    flag: '🇩🇰',
    nationalRegex: '\\d{8}',
    nationalMaxLength: 8,
    exampleLocal: '20123456',
  },
  {
    code: 'IE',
    nameEn: 'Ireland',
    nameBn: 'আয়ারল্যান্ড',
    dialCode: '353',
    flag: '🇮🇪',
    nationalRegex: '8\\d{8}',
    nationalMaxLength: 9,
    exampleLocal: '851234567',
  },
  {
    code: 'CH',
    nameEn: 'Switzerland',
    nameBn: 'সুইজারল্যান্ড',
    dialCode: '41',
    flag: '🇨🇭',
    nationalRegex: '7\\d{8}',
    nationalMaxLength: 9,
    exampleLocal: '781234567',
  },
  {
    code: 'AT',
    nameEn: 'Austria',
    nameBn: 'অস্ট্রিয়া',
    dialCode: '43',
    flag: '🇦🇹',
    nationalRegex: '6\\d{8,10}',
    nationalMaxLength: 11,
    exampleLocal: '6641234567',
  },
  {
    code: 'GR',
    nameEn: 'Greece',
    nameBn: 'গ্রিস',
    dialCode: '30',
    flag: '🇬🇷',
    nationalRegex: '6\\d{9}',
    nationalMaxLength: 10,
    exampleLocal: '6912345678',
  },
  {
    code: 'CZ',
    nameEn: 'Czech Republic',
    nameBn: 'চেক প্রজাতন্ত্র',
    dialCode: '420',
    flag: '🇨🇿',
    nationalRegex: '\\d{9}',
    nationalMaxLength: 9,
    exampleLocal: '601123456',
  },
  {
    code: 'RO',
    nameEn: 'Romania',
    nameBn: 'রোমানিয়া',
    dialCode: '40',
    flag: '🇷🇴',
    nationalRegex: '7\\d{8}',
    nationalMaxLength: 9,
    exampleLocal: '712345678',
  },
  {
    code: 'HU',
    nameEn: 'Hungary',
    nameBn: 'হাঙ্গেরি',
    dialCode: '36',
    flag: '🇭🇺',
    nationalRegex: '\\d{9}',
    nationalMaxLength: 9,
    exampleLocal: '201234567',
  },
];

/** Default country code for the register form. */
export const DEFAULT_COUNTRY_CODE = 'BD';

/**
 * Look up a country by ISO code (case-insensitive).
 * Returns the DEFAULT country if not found (never throws).
 */
export function getCountry(code: string): Country {
  const upper = (code || '').toUpperCase();
  return (
    COUNTRIES.find((c) => c.code === upper) ??
    COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY_CODE)!
  );
}

/**
 * Validate a national (local) phone number against a country's regex.
 * `national` must be WITHOUT dial code and WITHOUT leading 0.
 */
export function isValidNational(country: Country, national: string): boolean {
  const digits = national.replace(/\D/g, '');
  if (!digits) return false;
  const re = new RegExp(`^${country.nationalRegex}$`);
  return re.test(digits);
}

/**
 * Compose E.164 for storage: `+<dialCode><national>` (digits only).
 * Returns '' if the national part is empty.
 */
export function toE164(country: Country, national: string): string {
  const digits = national.replace(/\D/g, '');
  if (!digits) return '';
  return `+${country.dialCode}${digits}`;
}

/**
 * Parse an E.164 string into { country, national } by trying each
 * dial code prefix. Falls back to the DEFAULT country if no match.
 */
export function parseE164(e164: string): { country: Country; national: string } {
  const digits = (e164 || '').replace(/\D/g, '');
  // Longest dial codes first to avoid partial matches (e.g. 971 vs 97)
  const sorted = [...COUNTRIES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length,
  );
  for (const c of sorted) {
    if (digits.startsWith(c.dialCode)) {
      return { country: c, national: digits.slice(c.dialCode.length) };
    }
  }
  return { country: getCountry(DEFAULT_COUNTRY_CODE), national: digits };
}

/**
 * International E.164 regex (loose) — used by backend DTO validation.
 * Requires: leading '+', 7–15 total digits (E.164 spec).
 */
export const E164_REGEX = /^\+[1-9]\d{6,14}$/;