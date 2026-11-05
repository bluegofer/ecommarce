/**
 * PII scrub helpers for Sentry beforeSend hooks.
 * Removes emails, phone numbers, tokens, cookies from events before sending.
 *
 * Step 15.11.7 — DECISIONS.md compliance.
 */

const EMAIL_REGEX = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE_REGEX = /\+?\d{10,15}/g;
const BEARER_REGEX = /Bearer\s+[A-Za-z0-9._-]+/gi;
const JWT_REGEX = /eyJ[A-Za-z0-9._-]+/g;

export function scrubString(input: string | undefined): string | undefined {
  if (!input) return input;
  return input
    .replace(EMAIL_REGEX, '[EMAIL]')
    .replace(PHONE_REGEX, '[PHONE]')
    .replace(BEARER_REGEX, 'Bearer [REDACTED]')
    .replace(JWT_REGEX, '[JWT]');
}

export interface ScrubbableEvent {
  request?: {
    headers?: Record<string, string>;
    cookies?: Record<string, string> | string;
    data?: unknown;
    query_string?: string;
    url?: string;
  };
  user?: {
    email?: string;
    username?: string;
    ip_address?: string;
    [key: string]: unknown;
  };
  exception?: {
    values?: Array<{
      value?: string;
      [key: string]: unknown;
    }>;
  };
  extra?: Record<string, unknown>;
  breadcrumbs?: Array<{ message?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

/**
 * Global beforeSend scrubber. Returns the same event reference after scrubbing.
 */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  // 1. Request headers — drop auth + cookies entirely
  if (event.request?.headers) {
    delete event.request.headers['authorization'];
    delete event.request.headers['Authorization'];
    delete event.request.headers['cookie'];
    delete event.request.headers['Cookie'];
    delete event.request.headers['x-api-key'];
    delete event.request.headers['X-Api-Key'];
  }

  // 2. Request cookies — drop entirely
  if (event.request) {
    delete event.request.cookies;
  }

  // 3. User PII
  if (event.user) {
    if (event.user.email) event.user.email = '[EMAIL]';
    if (event.user.username) event.user.username = '[USERNAME]';
    if (event.user.ip_address) event.user.ip_address = '[IP]';
  }

  // 4. Exception messages — use type-safe conditional assignment
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((ex) => {
      const scrubbed = scrubString(ex.value);
      if (scrubbed !== undefined) {
        return { ...ex, value: scrubbed };
      }
      return ex;
    });
  }

  // 5. Breadcrumb messages — use type-safe conditional assignment
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((bc) => {
      const scrubbed = scrubString(bc.message);
      if (scrubbed !== undefined) {
        return { ...bc, message: scrubbed };
      }
      return bc;
    });
  }

  // 6. Extra data (best-effort string scrub)
  if (event.extra) {
    for (const key of Object.keys(event.extra)) {
      const val = event.extra[key];
      if (typeof val === 'string') {
        event.extra[key] = scrubString(val);
      }
    }
  }

  // 7. Request URL + query
  if (event.request?.url) {
    const scrubbed = scrubString(event.request.url);
    if (scrubbed !== undefined) {
      event.request.url = scrubbed;
    }
  }
  if (event.request?.query_string && typeof event.request.query_string === 'string') {
    const scrubbed = scrubString(event.request.query_string);
    if (scrubbed !== undefined) {
      event.request.query_string = scrubbed;
    }
  }

  return event;
}