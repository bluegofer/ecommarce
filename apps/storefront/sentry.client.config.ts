/**
 * Sentry client-side init for Storefront (browser).
 */
import * as Sentry from '@sentry/nextjs';
import { scrubEvent } from '@ecommarce/config/sentry';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
const tracesSampleRate = Number.parseFloat(
  process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.05',
);

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate,
    // Don't send default PII (IP, cookies, etc.)
    sendDefaultPii: false,
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'AbortError',
    ],
    beforeSend(event) {
      return scrubEvent(event as never) as never;
    },
  });
}