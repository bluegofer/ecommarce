/**
 * Next.js instrumentation hook — Sentry init dispatcher.
 * Runs on server + edge runtime starts.
 *
 * Step 15.11.6 — DECISIONS.md compliance.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}