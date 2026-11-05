// AnalyticsForwarderService — implements EventsService.EventForwarder.
// Registered in AnalyticsModule.onModuleInit(). Sends every PURCHASE event
// to GA4 + Meta CAPI server-side (TDD §6.12).
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createHash } from 'crypto';
import { AnalyticsAdapterRegistry } from './analytics-adapter.registry';
import { EventsService } from './events.service';
import type {
  AnalyticsAdapterEvent,
  AnalyticsUserData,
  Ga4AdapterEvent,
  MetaCapiAdapterEvent,
} from '@ecommarce/types';
import type { TrackEventDto } from '@ecommarce/types';

interface ForwardedEvent extends TrackEventDto {
  id: string;
  createdAt: Date;
}

@Injectable()
export class AnalyticsForwarderService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsForwarderService.name);

  constructor(
    private readonly registry: AnalyticsAdapterRegistry,
    private readonly events: EventsService,
  ) {}

  onModuleInit(): void {
    this.events.registerForwarder({
      forward: (e) => this.forward(e),
    });
  }

  private hash(value: string | undefined): string | undefined {
    if (!value) return undefined;
    return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
  }

  async forward(event: ForwardedEvent): Promise<void> {
    // Only forward high-signal events (PURCHASE for now). PAGE_VIEW etc. come
    // from the browser GTM tag directly; server-side duplicates add no value.
    if (event.eventType !== 'PURCHASE') return;

    const meta = (event.meta ?? {}) as Record<string, unknown>;
    const email = typeof meta['email'] === 'string' ? (meta['email'] as string) : undefined;
    const phone = typeof meta['phone'] === 'string' ? (meta['phone'] as string) : undefined;
    const ip = typeof meta['ip'] === 'string' ? (meta['ip'] as string) : undefined;
    const ua = typeof meta['userAgent'] === 'string' ? (meta['userAgent'] as string) : undefined;
    const fbp = typeof meta['fbp'] === 'string' ? (meta['fbp'] as string) : undefined;
    const fbc = typeof meta['fbc'] === 'string' ? (meta['fbc'] as string) : undefined;
    const valuePoisha = typeof meta['valuePoisha'] === 'number' ? (meta['valuePoisha'] as number) : 0;
    const currency = typeof meta['currency'] === 'string' ? (meta['currency'] as string) : 'BDT';
    const items = Array.isArray(meta['items']) ? (meta['items'] as unknown[]) : [];

    const userData: AnalyticsUserData = {
      emailHash: this.hash(email),
      phoneHash: this.hash(phone),
      clientIp: ip,
      userAgent: ua,
      fbpCookie: fbp,
      fbcCookie: fbc,
    };

    const clientId = event.sessionId ?? event.customerId ?? 'server-anon';
    const now = Date.now();
    const eventId = `purchase-${event.orderId ?? event.id}`;

    const ga4Event: Ga4AdapterEvent = {
      platform: 'GA4',
      name: 'purchase',
      clientId,
      userId: event.customerId ?? undefined,
      timestampMicros: now * 1000,
      params: {
        transaction_id: event.orderId,
        value: valuePoisha / 100,
        currency,
        items,
      },
      userData,
    };

    const metaEvent: MetaCapiAdapterEvent = {
      platform: 'META_CAPI',
      eventName: 'Purchase',
      eventId,
      eventTime: Math.floor(now / 1000),
      actionSource: 'website',
      userData,
      customData: {
        value: valuePoisha / 100,
        currency,
        order_id: event.orderId,
        contents: items,
      },
    };

    const adapters = this.registry.all();
    await Promise.all(
      adapters.map(async (adapter) => {
        const payload: AnalyticsAdapterEvent =
          adapter.platform === 'GA4' ? ga4Event : metaEvent;
        try {
          const result = await adapter.send(payload);
          if (!result.ok) {
            this.logger.warn(`${adapter.platform} forward failed: ${result.error}`);
          }
        } catch (err) {
          this.logger.warn(`${adapter.platform} forward threw: ${(err as Error).message}`);
        }
      }),
    );
  }
}