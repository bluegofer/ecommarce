// packages/types/src/promotions.ts
// Shared promotions DTOs. Money = integer poisha. Never float.

export type CouponType = 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';
export type DiscountScope = 'ORDER' | 'CATEGORY' | 'PRODUCT' | 'BRAND';

export interface CouponDto {
  id: string;
  code: string;
  type: CouponType;
  valuePercent: number | null;
  valuePoisha: number | null;
  minOrderPoisha: number;
  maxDiscountPoisha: number | null;
  totalUsageLimit: number | null;
  perCustomerLimit: number | null;
  timesRedeemed: number;
  validFrom: string | null;
  validUntil: string | null;
  firstOrderOnly: boolean;
  combinable: boolean;
  isActive: boolean;
  descriptionEn: string | null;
  descriptionBn: string | null;
  scopeJson: CouponScope | null;
  createdAt: string;
  updatedAt: string;
}

export interface CouponScope {
  categoryIds?: string[];
  productIds?: string[];
  brands?: string[];
}

export interface CreateCouponDto {
  code: string;
  type: CouponType;
  valuePercent?: number;
  valuePoisha?: number;
  minOrderPoisha?: number;
  maxDiscountPoisha?: number;
  totalUsageLimit?: number;
  perCustomerLimit?: number;
  validFrom?: string;
  validUntil?: string;
  firstOrderOnly?: boolean;
  combinable?: boolean;
  isActive?: boolean;
  descriptionEn?: string;
  descriptionBn?: string;
  scopeJson?: CouponScope;
}

export type UpdateCouponDto = Partial<CreateCouponDto>;

export interface AutomaticDiscountDto {
  id: string;
  name: string;
  type: CouponType;
  scope: DiscountScope;
  valuePercent: number | null;
  valuePoisha: number | null;
  minOrderPoisha: number;
  maxDiscountPoisha: number | null;
  scopeJson: CouponScope | null;
  priority: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutomaticDiscountDto {
  name: string;
  type: CouponType;
  scope?: DiscountScope;
  valuePercent?: number;
  valuePoisha?: number;
  minOrderPoisha?: number;
  maxDiscountPoisha?: number;
  scopeJson?: CouponScope;
  priority?: number;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
}

export type UpdateAutomaticDiscountDto = Partial<CreateAutomaticDiscountDto>;

export interface FlashSaleDto {
  id: string;
  name: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items?: FlashSaleItemDto[];
}

export interface FlashSaleItemDto {
  id: string;
  flashSaleId: string;
  variantId: string;
  dealPricePoisha: number;
  capQuantity: number | null;
  soldQuantity: number;
  maxPerCustomer: number | null;
  percentClaimed: number;
}

export interface CreateFlashSaleDto {
  name: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  isActive?: boolean;
  items: Array<{
    variantId: string;
    dealPricePoisha: number;
    capQuantity?: number;
    maxPerCustomer?: number;
  }>;
}

export type UpdateFlashSaleDto = Partial<CreateFlashSaleDto>;

// ---------------------------------------------------------------------------
// Cart context + rules engine
// ---------------------------------------------------------------------------

export interface CartItemContext {
  variantId: string;
  productId: string;
  categoryId: string;
  brand: string | null;
  pricePoisha: number;
  quantity: number;
}

export interface CartContext {
  items: CartItemContext[];
  subtotalPoisha: number;
  userId?: string;
  isFirstOrder?: boolean;
}

export interface DiscountBreakdownEntry {
  label: string;
  amountPoisha: number;
  source: 'coupon' | 'automatic';
  refId: string;
}

export interface EvaluateCartDto {
  items: CartItemContext[];
  couponCode?: string;
  userId?: string;
  isFirstOrder?: boolean;
}

export interface EvaluateCartResultDto {
  subtotalPoisha: number;
  discountPoisha: number;
  source: 'coupon' | 'automatic' | 'none';
  couponCode?: string;
  breakdown: DiscountBreakdownEntry[];
  couponError?: string;
}

// ---------------------------------------------------------------------------
// Coupon performance report
// ---------------------------------------------------------------------------

export interface CouponPerformanceDto {
  couponId: string;
  code: string;
  timesRedeemed: number;
  totalDiscountPoisha: number;
  uniqueCustomers: number;
  firstRedeemedAt: string | null;
  lastRedeemedAt: string | null;
}