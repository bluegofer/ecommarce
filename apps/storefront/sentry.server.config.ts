/**
 * Sentry server-side init for Storefront (Next.js Node runtime).
 */
import * as Sentry from '@sentry/nextjs';
import { scrubEvent } from '@ecommarce/config/sentry';

const dsn = process.env.SENTRY_DSN;
const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
const release = process.env.SENTRY_RELEASE;
const tracesSampleRate = Number.parseFloat(
  process.env.SENTRY_TRACES_SAMPLE_RATE || (environment === 'production' ? '0.05' : '0.1'),
);

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate,
    ignoreErrors: ['AbortError', 'ECONNRESET', 'NEXT_NOT_FOUND', 'NEXT_REDIRECT'],
    beforeSend(event) {
      return scrubEvent(event as never) as never;
    },
  });
}