/**
 * Step-79 — shared Header nav-links builder.
 *
 * Single source of truth for row2 nav items across all storefront pages.
 * SSR-safe (pure function, no hooks, no client-only APIs).
 *
 * Resolution order:
 *   1. If CMS HEADER menu exists with active items → use it (with children)
 *   2. Otherwise → Amazon-style 12-item fallback (en-first per client ask)
 */

interface MenuItemLike {
  labelEn: string;
  labelBn: string;
  url: string;
  isActive: boolean;
  children?: MenuItemLike[];
}

interface MenuLike {
  items: MenuItemLike[];
}

export interface HeaderNavLink {
  label: string;
  href: string;
  children?: HeaderNavLink[];
  opensMegaMenu?: boolean;
}

type Locale = 'bn' | 'en';

function absoluteHref(rawUrl: string, locale: Locale): string {
  if (!rawUrl) return `/${locale}`;
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  return rawUrl.startsWith('/') ? `/${locale}${rawUrl}` : `/${locale}/${rawUrl}`;
}

function mapCmsItem(item: MenuItemLike, locale: Locale): HeaderNavLink {
  const label = locale === 'bn' ? item.labelBn : item.labelEn;
  const kids = (item.children ?? [])
    .filter((c) => c.isActive)
    .map((c) => mapCmsItem(c, locale));
  const out: HeaderNavLink = { label, href: absoluteHref(item.url, locale) };
  if (kids.length > 0) out.children = kids;
  return out;
}

export function fallbackHeaderNavLinks(locale: Locale): HeaderNavLink[] {
  const L = (en: string, bn: string) => (locale === 'bn' ? bn : en);
  const c = (slug: string) => `/${locale}/c/${slug}`;
  return [
    { label: L("Today's Deals", 'আজকের ডিল'), href: `/${locale}/deals` },
    { label: L('New Arrivals', 'নতুন এসেছে'), href: `/${locale}/new-arrivals` },
    { label: L('Best Sellers', 'বেস্ট সেলার'), href: `/${locale}/best-sellers` },
    {
      label: L('Electronics', 'ইলেকট্রনিক্স'),
      href: c('electronics'),
      children: [
        { label: L('Mobile Phones', 'মোবাইল ফোন'), href: c('mobile-phones') },
        { label: L('Laptops', 'ল্যাপটপ'), href: c('laptops') },
        { label: L('Headphones', 'হেডফোন'), href: c('headphones') },
        { label: L('Smart Watches', 'স্মার্ট ওয়াচ'), href: c('smart-watches') },
        { label: L('Cameras', 'ক্যামেরা'), href: c('cameras') },
      ],
    },
    {
      label: L('Fashion', 'ফ্যাশন'),
      href: c('fashion'),
      children: [
        { label: L('Men', 'পুরুষ'), href: c('men') },
        { label: L('Women', 'নারী'), href: c('women') },
        { label: L('Kids', 'শিশু'), href: c('kids') },
        { label: L('Shoes', 'জুতা'), href: c('shoes') },
        { label: L('Bags', 'ব্যাগ'), href: c('bags') },
      ],
    },
    {
      label: L('Home & Kitchen', 'হোম ও কিচেন'),
      href: c('home-kitchen'),
      children: [
        { label: L('Cookware', 'কুকওয়্যার'), href: c('cookware') },
        { label: L('Furniture', 'ফার্নিচার'), href: c('furniture') },
        { label: L('Home Decor', 'হোম ডেকর'), href: c('decor') },
        { label: L('Bedding', 'বেডিং'), href: c('bedding') },
        { label: L('Cleaning', 'ক্লিনিং'), href: c('cleaning') },
      ],
    },
    { label: L('Grocery', 'গ্রোসারি'), href: c('grocery') },
    { label: L('Beauty & Health', 'বিউটি ও হেলথ'), href: c('beauty-health') },
    { label: L('Toys & Baby', 'টয় ও বেবি'), href: c('toys-baby') },
    { label: L('Customer Service', 'কাস্টমার সার্ভিস'), href: `/${locale}/pages/contact` },
    { label: L('About', 'আমাদের সম্পর্কে'), href: `/${locale}/pages/about-us` },
  ];
}

export function buildHeaderNavLinks(
  locale: Locale,
  headerMenu: MenuLike | null | undefined,
): HeaderNavLink[] {
  if (headerMenu && headerMenu.items && headerMenu.items.length > 0) {
    const items = headerMenu.items
      .filter((it) => it.isActive)
      .map((it) => mapCmsItem(it, locale));
    if (items.length > 0) return items;
  }
  return fallbackHeaderNavLinks(locale);
}