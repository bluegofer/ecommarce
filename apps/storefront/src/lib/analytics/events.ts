/**
 * Analytics event helper — front-end intake.
 *
 * In Step 10 this posts to /api/v1/analytics/events (TDD §6.12), which then
 * forwards server-side to GA4 Measurement Protocol + Meta Conversions API via
 * the outbox pattern (TDD §11.3). For Step 7 it's a no-op stub that:
 *   - no-ops on the server (SSR safety)
 *   - logs to console in dev when NEXT_PUBLIC_ANALYTICS_DEBUG=1
 *   - never throws (analytics must not break the shopper journey)
 *
 * Event names match TDD §6.12 taxonomy so Step 10 wiring is a drop-in.
 */

export type AnalyticsEventName =
  | 'PAGE_VIEW'
  | 'SEARCH'
  | 'PRODUCT_VIEW'
  | 'ADD_TO_CART'
  | 'CHECKOUT_START'
  | 'PURCHASE';

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  /** ISO timestamp; set by track() if not provided. */
  ts?: string;
  /** Locale at time of event. */
  locale?: 'bn' | 'en';
  /** Free-form context — productId, query, orderId, value, etc. */
  properties?: Record<string, unknown>;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function shouldDebug(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === '1'
  );
}

/**
 * Fire-and-forget analytics event. Never throws, never blocks.
 * In Step 10 replace the body with a beacon()/fetch() to the API.
 */
export function track(name: AnalyticsEventName, properties?: Record<string, unknown>): void {
  if (!isBrowser()) return; // SSR: skip; server-side events come later

  const event: AnalyticsEvent = {
    name,
    ts: new Date().toISOString(),
    properties,
  };

  if (shouldDebug()) {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', event);
  }

  // TODO Step 10: navigator.sendBeacon(`${API_BASE_URL}/analytics/events`, ...)
  // or fetch(..., { keepalive: true }) so events survive navigation.
}