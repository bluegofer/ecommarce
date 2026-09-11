// packages/types/src/analytics.ts

export type AnalyticsEventType =
  | 'PAGE_VIEW'
  | 'SEARCH'
  | 'PRODUCT_VIEW'
  | 'ADD_TO_CART'
  | 'CHECKOUT_START'
  | 'CHECKOUT_STEP'
  | 'PURCHASE';

export interface TrackEventDto {
  eventType: AnalyticsEventType;
  sessionId?: string;
  customerId?: string;
  productId?: string;
  variantId?: string;
  orderId?: string;
  path?: string;
  query?: string;
  meta?: Record<string, unknown>;
}

export interface SalesReportDto {
  from: string;
  to: string;
  ordersCount: number;
  paidOrdersCount: number;
  revenuePoisha: number;
  refundedPoisha: number;
  aovPoisha: number;
  newCustomers: number;
  repeatCustomers: number;
  returnedOrders: number;
}

export interface SalesReportRowDto {
  date: string;
  ordersCount: number;
  revenuePoisha: number;
  aovPoisha: number;
}

export interface TopProductDto {
  productId: string;
  titleEn: string;
  titleBn: string;
  unitsSold: number;
  revenuePoisha: number;
}

export interface FunnelStepDto {
  step: 'visit' | 'product_view' | 'add_to_cart' | 'checkout_start' | 'purchase';
  count: number;
  conversionFromPrevious: number;
}

export interface FunnelReportDto {
  from: string;
  to: string;
  steps: FunnelStepDto[];
}

export interface DailySummaryRowDto {
  date: string;
  ordersCount: number;
  revenuePoisha: number;
  aovPoisha: number;
  uniqueCustomers: number;
}

export interface ReportQueryDto {
  from?: string;
  to?: string;
  groupBy?: 'day' | 'week' | 'month';
}