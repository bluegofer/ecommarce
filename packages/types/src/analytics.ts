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
// ---------------------------------------------------------------------------
// Step 13.1 — Server-side analytics adapter contracts (GA4 MP + Meta CAPI).
// Adapter plumbing only. Real HTTP calls wired in Step 13.6.
// Names are suffixed "Adapter*" to avoid colliding with first-party report DTOs above.
// ---------------------------------------------------------------------------

export type AnalyticsAdapterPlatform = 'GA4' | 'META_CAPI';

export interface AnalyticsUserData {
  /** SHA-256 hex, lowercased. */
  emailHash: string | undefined;
  /** SHA-256 hex, lowercased. */
  phoneHash: string | undefined;
  clientIp: string | undefined;
  userAgent: string | undefined;
  /** Meta browser cookie _fbp, passed through from the checkout request. */
  fbpCookie: string | undefined;
  /** Meta click-id cookie _fbc. */
  fbcCookie: string | undefined;
}

export interface Ga4AdapterEvent {
  platform: 'GA4';
  name: string;
  clientId: string;
  userId: string | undefined;
  timestampMicros: number;
  params: Record<string, unknown>;
  userData: AnalyticsUserData;
}

export interface MetaCapiAdapterEvent {
  platform: 'META_CAPI';
  eventName: string;
  /** Shared with the browser pixel for dedup. */
  eventId: string;
  eventTime: number;
  actionSource: 'website';
  userData: AnalyticsUserData;
  customData: Record<string, unknown>;
}

export type AnalyticsAdapterEvent = Ga4AdapterEvent | MetaCapiAdapterEvent;

export interface AnalyticsDispatchResult {
  ok: boolean;
  error: string | undefined;
}

export interface AnalyticsAdapter {
  readonly platform: AnalyticsAdapterPlatform;
  send(event: AnalyticsAdapterEvent): Promise<AnalyticsDispatchResult>;
}