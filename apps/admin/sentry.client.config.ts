/**
 * Sentry client-side init for Admin.
 */
import * as Sentry from '@sentry/nextjs';
import { scrubEvent } from '@ecommarce/config/sentry';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
    beforeSend(event) {
      return scrubEvent(event as never) as never;
    },
  });
}