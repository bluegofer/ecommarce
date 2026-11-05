// Real Pathao adapter (D-06 primary). Endpoints env-driven via PATHAO_BASE_URL.
// Auth: client credentials -> access token (cached, 40 min TTL).
import { Logger } from '@nestjs/common';
import type {
  ConsignmentInput,
  ConsignmentResult,
  CourierAdapter,
  CourierProvider,
  CourierTrackingEvent,
  SettlementRecord,
  TrackingSyncInput,
  TrackingSyncResult,
} from '@ecommarce/types';

interface PathaoCfg {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
}

interface PathaoOrderResponse {
  data?: { consignment_id?: string; tracking_code?: string; merchant_order_id?: string };
  message?: string;
}

export class PathaoAdapter implements CourierAdapter {
  public readonly provider: CourierProvider = 'PATHAO';
  private readonly logger = new Logger(PathaoAdapter.name);
  private cache: { token: string; expiresAt: number } | null = null;

  constructor(private readonly cfg: PathaoCfg) {}

  private async token(): Promise<string> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now + 30_000) return this.cache.token;
    const res = await fetch(`${this.cfg.baseUrl}/aladdin/api/v1/issue-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.cfg.clientId,
        client_secret: this.cfg.clientSecret,
        grant_type: 'password',
        username: process.env.PATHAO_USERNAME ?? '',
        password: process.env.PATHAO_PASSWORD ?? '',
      }),
    });
    const json = (await res.json()) as TokenResponse;
    if (!json.access_token) throw new Error(`Pathao auth failed: ${JSON.stringify(json)}`);
    this.cache = { token: json.access_token, expiresAt: now + (json.expires_in ?? 2400) * 1000 };
    return json.access_token;
  }

  async createConsignment(input: ConsignmentInput): Promise<ConsignmentResult> {
    const token = await this.token();
    const res = await fetch(`${this.cfg.baseUrl}/aladdin/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        store_id: Number(process.env.PATHAO_STORE_ID ?? 0),
        merchant_order_id: input.orderNumber,
        recipient_name: input.recipientName,
        recipient_phone: input.recipientPhone,
        recipient_address: input.recipientAddress,
        recipient_city: Number(process.env.PATHAO_CITY_ID ?? 1),
        recipient_zone: Number(process.env.PATHAO_ZONE_ID ?? 1),
        delivery_type: 48,
        item_type: 2,
        item_quantity: input.itemCount,
        item_weight: input.weightGrams / 1000,
        amount_to_collect: input.codAmountPoisha / 100,
        special_instruction: input.merchantNote ?? '',
      }),
    });
    const json = (await res.json()) as PathaoOrderResponse;
    if (!json.data?.consignment_id) {
      this.logger.warn(`Pathao create failed: ${JSON.stringify(json)}`);
      return { ok: false, provider: this.provider, consignmentId: undefined, trackingUrl: undefined, rawResponse: json as unknown as Record<string, unknown> };
    }
    return {
      ok: true,
      provider: this.provider,
      consignmentId: json.data.consignment_id,
      trackingUrl: `https://merchant.pathao.com/tracking/${json.data.consignment_id}`,
      rawResponse: json as unknown as Record<string, unknown>,
    };
  }

  async syncTracking(input: TrackingSyncInput): Promise<TrackingSyncResult> {
    const token = await this.token();
    const res = await fetch(`${this.cfg.baseUrl}/aladdin/api/v1/orders/${input.consignmentId}/info`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = (await res.json()) as { data?: { order_status?: string; updated_at?: string } };
    const status = json.data?.order_status;
    if (!status) return { ok: false, events: [], rawResponse: json as unknown as Record<string, unknown> };
    const mapped: 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED' | 'PENDING' =
      status === 'Delivered' ? 'DELIVERED' : status === 'Returned' ? 'RETURNED' : 'IN_TRANSIT';
    return {
      ok: true,
      events: [
        {
          eventId: `${input.consignmentId}:${status}:${json.data?.updated_at ?? ''}`,
          provider: this.provider,
          consignmentId: input.consignmentId,
          status: mapped,
          message: status,
          occurredAt: json.data?.updated_at ?? new Date().toISOString(),
          raw: json as unknown as Record<string, unknown>,
        },
      ],
      rawResponse: json as unknown as Record<string, unknown>,
    };
  }

  async fetchSettlements(_periodStart: string, _periodEnd: string): Promise<SettlementRecord[]> {
    // Pathao does not expose a settlement API to merchants at the time of
    // writing; reconciliation is manual (TDD §A.4). Return empty so callers
    // fall through to manual data.
    this.logger.log('Pathao settlement API not available; manual reconciliation expected');
    return [];
  }

  async verifyWebhook(rawBody: string, signature: string | undefined): Promise<CourierTrackingEvent | null> {
    if (!signature) return null;
    try {
      const parsed = JSON.parse(rawBody) as Record<string, unknown>;
      const consignmentId = String(parsed['consignment_id'] ?? '');
      const status = String(parsed['order_status'] ?? '');
      if (!consignmentId) return null;
      const mapped: 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED' =
        status === 'Delivered' ? 'DELIVERED' : status === 'Returned' ? 'RETURNED' : 'IN_TRANSIT';
      return {
        eventId: `${consignmentId}:${status}`,
        provider: this.provider,
        consignmentId,
        status: mapped,
        message: status,
        occurredAt: new Date().toISOString(),
        raw: parsed,
      };
    } catch {
      return null;
    }
  }
}