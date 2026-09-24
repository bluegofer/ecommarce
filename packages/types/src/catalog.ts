// packages/types/src/catalog.ts
// Shared catalog DTOs + enums — contract between API / storefront / admin.
// All money values are integers in poisha. Never use float.

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type AttributeType = 'TEXT' | 'NUMBER' | 'ENUM' | 'BOOLEAN';

export type ProductStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

export type MediaType = 'IMAGE' | 'VIDEO';

export type AdjustmentReason =
  | 'RESTOCK'
  | 'DAMAGE'
  | 'RETURN'
  | 'CORRECTION'
  | 'SALE'
  | 'RESERVATION_RELEASE';

export type SortOrder =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'newest'
  | 'rating'
  | 'best_sellers';

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

export interface CategoryDto {
  id: string;
  parentId: string | null;
  nameEn: string;
  nameBn: string;
  slug: string;
  descriptionEn: string | null;
  descriptionBn: string | null;
  imageUrl: string | null;
  iconName: string | null;
  sortOrder: number;
  isActive: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
}

export interface CategoryTreeNode extends CategoryDto {
  children: CategoryTreeNode[];
}

export interface CreateCategoryDto {
  parentId?: string | null;
  nameEn: string;
  nameBn: string;
  slug?: string;
  descriptionEn?: string;
  descriptionBn?: string;
  imageUrl?: string;
  iconName?: string;
  sortOrder?: number;
  isActive?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export type UpdateCategoryDto = Partial<CreateCategoryDto>;

// ---------------------------------------------------------------------------
// Attribute
// ---------------------------------------------------------------------------

export interface AttributeDto {
  id: string;
  nameEn: string;
  nameBn: string;
  slug: string;
  type: AttributeType;
  unit: string | null;
  options: string[] | null;
  isVariant: boolean;
  isFilterable: boolean;
  sortOrder: number;
}

export interface CreateAttributeDto {
  nameEn: string;
  nameBn: string;
  slug?: string;
  type: AttributeType;
  unit?: string;
  options?: string[];
  isVariant?: boolean;
  isFilterable?: boolean;
  sortOrder?: number;
}

export type UpdateAttributeDto = Partial<CreateAttributeDto>;

export interface CategoryAttributeDto {
  id: string;
  categoryId: string;
  attributeId: string;
  isRequired: boolean;
  sortOrder: number;
  attribute?: AttributeDto;
}

export interface AttachAttributeDto {
  attributeId: string;
  isRequired?: boolean;
  sortOrder?: number;
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export interface ProductDto {
  id: string;
  categoryId: string;
  slug: string;
  titleEn: string;
  titleBn: string;
  descriptionEn: string | null;
  descriptionBn: string | null;
  brand: string | null;
  status: ProductStatus;
  publishedAt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  bulletFeatures: string[] | null;
  specsJson: Record<string, string> | null;
  avgRating: number;
  ratingCount: number;
  soldCount: number;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductAttributeValueDto {
  attributeId: string;
  valueText?: string | null;
  valueNumber?: number | null;
  valueBool?: boolean | null;
  valueJson?: unknown;
}

export interface CreateProductDto {
  categoryId: string;
  slug?: string;
  titleEn: string;
  titleBn: string;
  descriptionEn?: string;
  descriptionBn?: string;
  brand?: string;
  status?: ProductStatus;
  publishedAt?: string;
  metaTitle?: string;
  metaDescription?: string;
  bulletFeatures?: string[];
  specsJson?: Record<string, string>;
  isFeatured?: boolean;
  attributeValues?: ProductAttributeValueDto[];
}

export type UpdateProductDto = Partial<CreateProductDto>;

export interface ProductListQueryDto {
  categoryId?: string;
  status?: ProductStatus;
  brand?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: SortOrder;
}

export interface PaginatedProductsDto {
  items: ProductDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Variant
// ---------------------------------------------------------------------------

export interface VariantDto {
  id: string;
  productId: string;
  warehouseId: string | null;
  sku: string;
  barcode: string | null;
  pricePoisha: number;
  compareAtPoisha: number | null;
  stock: number;
  lowStockThreshold: number;
  attributeValues: Record<string, string>;
  isActive: boolean;
}

export interface CreateVariantDto {
  sku: string;
  barcode?: string;
  pricePoisha: number;
  compareAtPoisha?: number;
  stock?: number;
  lowStockThreshold?: number;
  attributeValues: Record<string, string>;
  isActive?: boolean;
  warehouseId?: string;
}

export type UpdateVariantDto = Partial<CreateVariantDto>;

export interface VariantMatrixRequestDto {
  productId: string;
  axes: Array<{
    attributeSlug: string;
    values: string[];
  }>;
  basePricePoisha: number;
  baseCompareAtPoisha?: number;
  skuPrefix?: string;
  defaultStock?: number;
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export interface ProductMediaDto {
  id: string;
  productId: string | null;
  variantId: string | null;
  type: MediaType;
  url: string;
  altText: string | null;
  sortOrder: number;
  width: number | null;
  height: number | null;
}

export interface CreateProductMediaDto {
  url: string;
  altText?: string;
  sortOrder?: number;
  type?: MediaType;
  width?: number;
  height?: number;
  variantId?: string | null;
}

export type UpdateProductMediaDto = Partial<CreateProductMediaDto>;

// ---------------------------------------------------------------------------
// Slug redirect
// ---------------------------------------------------------------------------

export interface SlugRedirectDto {
  id: string;
  fromSlug: string;
  toSlug: string;
  entityType: string;
  statusCode: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export interface InventoryAdjustmentDto {
  id: string;
  variantId: string;
  warehouseId: string | null;
  delta: number;
  reason: AdjustmentReason;
  reasonNote: string | null;
  stockBefore: number;
  stockAfter: number;
  actorUserId: string | null;
  referenceId: string | null;
  createdAt: string;
}

export interface AdjustStockDto {
  variantId: string;
  delta: number;
  reason: AdjustmentReason;
  reasonNote?: string;
  referenceId?: string;
  warehouseId?: string;
}

export interface ReserveStockDto {
  variantId: string;
  quantity: number;
  ttlSeconds?: number;
}

export interface ReservationDto {
  reservationId: string;
  variantId: string;
  quantity: number;
  expiresAt: string;
}

export interface LowStockItemDto {
  variantId: string;
  productId: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  titleEn: string;
  titleBn: string;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface SearchFiltersDto {
  q?: string;
  categoryId?: string;
  categorySlug?: string;
  brand?: string[];
  minPricePoisha?: number;
  maxPricePoisha?: number;
  minRating?: number;
  attributes?: Record<string, string[]>;
  inStock?: boolean;
}

export interface SearchRequestDto extends SearchFiltersDto {
  sort?: SortOrder;
  page?: number;
  pageSize?: number;
}

export interface FacetBucket {
  value: string;
  count: number;
  labelEn?: string;
  labelBn?: string;
}

export interface PriceRangeBucket {
  minPoisha: number;
  maxPoisha: number;
  count: number;
}

export interface SearchFacetsDto {
  brands: FacetBucket[];
  priceRanges: PriceRangeBucket[];
  categories: FacetBucket[];
  attributes: Record<string, FacetBucket[]>;
  ratings: FacetBucket[];
}

export interface SearchResponseDto {
  items: ProductDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: SearchFacetsDto;
}

export interface SuggestionDto {
  text: string;
  type: 'product' | 'category' | 'brand' | 'query';
  slug?: string;
  score?: number;
}

export interface SuggestionsResponseDto {
  suggestions: SuggestionDto[];
  trending: string[];
}

// ---------------------------------------------------------------------------
// CSV import/export
// ---------------------------------------------------------------------------

export interface CsvImportErrorDto {
  row: number;
  field?: string;
  message: string;
  rawRow?: Record<string, string>;
}

export interface CsvImportResultDto {
  totalRows: number;
  importedProducts: number;
  importedVariants: number;
  failedRows: number;
  errors: CsvImportErrorDto[];
}