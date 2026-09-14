// GA4 Measurement Protocol adapter (TDD §6.12).
// POST https://www.google-analytics.com/mp/collect?measurement_id=&api_secret=
// Server-side — survives browser ad-blockers.
import { Logger } from '@nestjs/common';
import type {
  AnalyticsAdapter,
  AnalyticsAdapterEvent,
  AnalyticsDispatchResult,
  AnalyticsAdapterPlatform,
  Ga4AdapterEvent,
} from '@ecommarce/types';

interface Ga4Cfg {
  measurementId: string;
  apiSecret: string;
}

export class Ga4Adapter implements AnalyticsAdapter {
  public readonly platform: AnalyticsAdapterPlatform = 'GA4';
  private readonly logger = new Logger(Ga4Adapter.name);

  constructor(private readonly cfg: Ga4Cfg) {}

  async send(event: AnalyticsAdapterEvent): Promise<AnalyticsDispatchResult> {
    if (event.platform !== 'GA4') {
      return { ok: false, error: 'wrong platform' };
    }
    const e = event as Ga4AdapterEvent;
    const url =
      `https://www.google-analytics.com/mp/collect` +
      `?measurement_id=${encodeURIComponent(this.cfg.measurementId)}` +
      `&api_secret=${encodeURIComponent(this.cfg.apiSecret)}`;

    const body = {
      client_id: e.clientId,
      user_id: e.userId ?? undefined,
      timestamp_micros: e.timestampMicros,
      events: [
        {
          name: e.name,
          params: {
            ...e.params,
            engagement_time_msec: 100,
          },
        },
      ],
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        return { ok: false, error: `GA4 ${res.status}` };
      }
      return { ok: true, error: undefined };
    } catch (err) {
      this.logger.warn(`GA4 send failed: ${(err as Error).message}`);
      return { ok: false, error: (err as Error).message };
    }
  }
}