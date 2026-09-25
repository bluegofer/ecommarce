/**
 * API response shapes for storefront consumption.
 *
 * These mirror what apps/api actually returns as of Step 8. Note: some
 * endpoints wrap responses in { value, Count } (NestJS interceptor), others
 * return raw objects/arrays. Normalization happens in the wrapper functions
 * (catalog.ts, cms.ts, promotions.ts) — this file only declares the *unwrapped*
 * shapes that page code sees.
 *
 * Step 9 (Admin) may consolidate these with @ecommarce/types.
 */

// ── Catalog ──────────────────────────────────────

export interface CategoryNode {
  id: string;
  parentId: string | null;
  nameEn: string;
  nameBn: string;
  slug: string;
  iconName: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  children: CategoryNode[];
}

export interface ProductSummary {
  id: string;
  categoryId: string;
  slug: string;
  titleEn: string;
  titleBn: string;
  descriptionEn: string | null;
  descriptionBn: string | null;
  brand: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  deliveryTimeEn: string | null;
  deliveryTimeBn: string | null;
  videoUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  bulletFeatures: string[] | null;
  specsJson: Record<string, unknown> | null;
  avgRating: number | string;
  ratingCount: number;
  soldCount: number;
  isFeatured: boolean;
  /** Present on search/list responses when variant data is joined. */
  variants?: VariantSummary[];
  /** Present on list responses when cheapest variant is joined. */
  minPricePoisha?: number;
  maxCompareAtPoisha?: number | null;
  primaryImageUrl?: string | null;
  totalStock?: number;
}

export interface VariantSummary {
  id: string;
  productId: string;
  sku: string;
  pricePoisha: number;
  compareAtPoisha: number | null;
  stock: number;
  lowStockThreshold: number;
  attributeValues: Record<string, string>;
  isActive: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Search facets ────────────────────────────────

export interface FacetBucket {
  value: string;
  count: number;
}

export interface PriceRangeBucket {
  minPoisha: number;
  maxPoisha: number;
  count: number;
}

export interface SearchFacets {
  brands: FacetBucket[];
  categories: FacetBucket[];
  ratings: FacetBucket[];
  priceRanges: PriceRangeBucket[];
  attributes: Record<string, FacetBucket[]>;
}

export interface SearchResponse extends Paginated<ProductSummary> {
  facets: SearchFacets;
}

// ── CMS ──────────────────────────────────────────

export interface Announcement {
  id: string;
  textEn: string;
  textBn: string;
  bgColor: string;
  textColor: string;
  linkUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}

export interface CmsSection {
  id: string;
  key: string;
  sectionType: string;
  titleEn: string | null;
  titleBn: string | null;
  position: number;
  config: Record<string, unknown> | null;
  isVisible: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export interface HomeFeed {
  announcements: Announcement[];
  sections: CmsSection[];
  activeFlashSales: FlashSaleSummary[];
  activePopups: unknown[];
}

export interface CmsPage {
  id: string;
  slug: string;
  titleEn: string;
  titleBn: string;
  bodyEn: string | null;
  bodyBn: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  deliveryTimeEn: string | null;
  deliveryTimeBn: string | null;
  videoUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  currentRevision: number;
}

export interface CmsMenuItem {
  id: string;
  labelEn: string;
  labelBn: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
  children: CmsMenuItem[];
}

export interface CmsMenu {
  id: string;
  location: 'HEADER' | 'FOOTER' | 'MOBILE';
  name: string;
  items: CmsMenuItem[];
}

// ── Promotions ───────────────────────────────────

export interface FlashSaleSummary {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  itemCount: number;
}

export interface FlashSaleItem {
  id: string;
  flashSaleId: string;
  variantId: string;
  dealPricePoisha: number;
  capQuantity: number | null;
  soldQuantity: number;
  maxPerCustomer: number | null;
  percentClaimed: number;
}

export interface FlashSale {
  id: string;
  name: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  items: FlashSaleItem[];
}