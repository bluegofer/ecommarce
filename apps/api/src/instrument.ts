/**
 * Sentry initialization for the NestJS API.
 *
 * CRITICAL: This file MUST be imported at the very top of `main.ts`,
 * before any other imports, so that Sentry can instrument the runtime.
 *
 * Environment variables:
 *   SENTRY_DSN         — required in production/staging; if absent, SDK is disabled
 *   SENTRY_ENVIRONMENT — "staging" | "production" (defaults to NODE_ENV)
 *   SENTRY_RELEASE     — git sha or version string (set by CI)
 *   SENTRY_TRACES_SAMPLE_RATE — 0..1 (default 0.1 in staging, 0.05 in prod)
 *
 * Step 15.11.5 — DECISIONS.md compliance.
 */
import * as Sentry from '@sentry/nestjs';
import { scrubEvent } from './common/sentry/pii-scrub';

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
    // Never auto-attach request bodies (may contain PII)
    attachStacktrace: true,
    // Ignore benign errors
    ignoreErrors: [
      'Non-Error promise rejection captured',
      'Non-Error exception captured',
      'AbortError',
      'ECONNRESET',
    ],
    beforeSend(event) {
      return scrubEvent(event as never) as never;
    },
    beforeBreadcrumb(breadcrumb) {
      // Drop console breadcrumbs in production (reduce noise + PII risk)
      if (environment === 'production' && breadcrumb.category === 'console') {
        return null;
      }
      return breadcrumb;
    },
  });
  // eslint-disable-next-line no-console
  console.log(`[sentry] API initialized (env=${environment}, traces=${tracesSampleRate})`);
} else {
  // eslint-disable-next-line no-console
  console.log('[sentry] API: SENTRY_DSN not set — Sentry disabled');
}