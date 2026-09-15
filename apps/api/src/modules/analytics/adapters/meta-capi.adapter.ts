// Meta Conversions API adapter (TDD §6.12).
// POST https://graph.facebook.com/v18.0/{pixel_id}/events
// Email / phone are SHA-256 hashed before send — Meta requires it.
import { Logger } from '@nestjs/common';
import type {
  AnalyticsAdapter,
  AnalyticsAdapterEvent,
  AnalyticsAdapterPlatform,
  AnalyticsDispatchResult,
  MetaCapiAdapterEvent,
} from '@ecommarce/types';

interface MetaCapiCfg {
  pixelId: string;
  accessToken: string;
}

export class MetaCapiAdapter implements AnalyticsAdapter {
  public readonly platform: AnalyticsAdapterPlatform = 'META_CAPI';
  private readonly logger = new Logger(MetaCapiAdapter.name);

  constructor(private readonly cfg: MetaCapiCfg) {}

  async send(event: AnalyticsAdapterEvent): Promise<AnalyticsDispatchResult> {
    if (event.platform !== 'META_CAPI') {
      return { ok: false, error: 'wrong platform' };
    }
    const e = event as MetaCapiAdapterEvent;
    const url = `https://graph.facebook.com/v18.0/${encodeURIComponent(
      this.cfg.pixelId,
    )}/events?access_token=${encodeURIComponent(this.cfg.accessToken)}`;

    const userData: Record<string, unknown> = {};
    if (e.userData.emailHash) userData['em'] = [e.userData.emailHash];
    if (e.userData.phoneHash) userData['ph'] = [e.userData.phoneHash];
    if (e.userData.clientIp) userData['client_ip_address'] = e.userData.clientIp;
    if (e.userData.userAgent) userData['client_user_agent'] = e.userData.userAgent;
    if (e.userData.fbpCookie) userData['fbp'] = e.userData.fbpCookie;
    if (e.userData.fbcCookie) userData['fbc'] = e.userData.fbcCookie;

    const body = {
      data: [
        {
          event_name: e.eventName,
          event_time: e.eventTime,
          event_id: e.eventId,
          action_source: e.actionSource,
          user_data: userData,
          custom_data: e.customData,
        },
      ],
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        this.logger.warn(`Meta CAPI ${res.status}: ${JSON.stringify(json)}`);
        return { ok: false, error: `Meta ${res.status}` };
      }
      return { ok: true, error: undefined };
    } catch (err) {
      this.logger.warn(`Meta CAPI send failed: ${(err as Error).message}`);
      return { ok: false, error: (err as Error).message };
    }
  }
}