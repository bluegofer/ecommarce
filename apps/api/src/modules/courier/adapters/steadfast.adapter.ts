// apps/api/src/modules/courier/adapters/steadfast.adapter.ts
// Real Steadfast Courier adapter (D-06 primary when active).
// Base URL env-driven via STEADFAST_BASE_URL.
// Auth: static Api-Key + Secret-Key headers (no OAuth refresh needed).
// Reference: https://portal.steadfast.com.bd/api/v1
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

interface SteadfastCfg {
  baseUrl: string;
  apiKey: string;
  secretKey: string;
}

interface SteadfastCreateResponse {
  status?: number;
  message?: string;
  consignment?: {
    consignment_id?: string | number;
    tracking_code?: string;
    invoice?: string;
  };
}

interface SteadfastStatusResponse {
  status?: number;
  delivery_status?: string;
  consignment?: {
    consignment_id?: number;
    tracking_code?: string;
    status?: string;
    updated_at?: string;
  };
}

/**
 * Steadfast delivery_status → our ShipmentStatus mapping.
 * Source: https://portal.steadfast.com.bd (status list)
 */
function mapSteadfastStatus(raw: string | undefined): CourierTrackingEvent['status'] {
  const s = (raw ?? '').toLowerCase();
  if (s === 'delivered' || s === 'partial_delivered' || s === 'delivered_approval_pending' || s === 'partial_delivered_approval_pending') return 'DELIVERED';
  if (s === 'cancelled' || s === 'cancelled_approval_pending') return 'RETURNED';
  if (s === 'unknown' || s === 'unknown_approval_pending') return 'RETURNED';
  if (s === 'out_for_delivery' || s === 'in_transit' || s === 'picked' || s === 'picked_up') return 'IN_TRANSIT';
  // default: pending / in_review / hold / received_at_hub
  return 'PENDING';
}

export class SteadfastAdapter implements CourierAdapter {
  public readonly provider: CourierProvider = 'STEADFAST';
  private readonly logger = new Logger(SteadfastAdapter.name);

  constructor(private readonly cfg: SteadfastCfg) {}

  private headers(): Record<string, string> {
    return {
      'Api-Key': this.cfg.apiKey,
      'Secret-Key': this.cfg.secretKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  async createConsignment(input: ConsignmentInput): Promise<ConsignmentResult> {
    try {
      const res = await fetch(`${this.cfg.baseUrl}/create_order`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          invoice: input.orderNumber,
          recipient_name: input.recipientName,
          recipient_phone: input.recipientPhone,
          recipient_address: input.recipientAddress,
          cod_amount: input.codAmountPoisha / 100,
          note: input.merchantNote ?? '',
        }),
      });
      const json = (await res.json()) as SteadfastCreateResponse;
      const consignmentId = json.consignment?.consignment_id;
      if (!consignmentId) {
        this.logger.warn(`Steadfast create failed: ${JSON.stringify(json)}`);
        return {
          ok: false,
          provider: this.provider,
          consignmentId: undefined,
          trackingUrl: undefined,
          rawResponse: json as unknown as Record<string, unknown>,
        };
      }
      const idStr = String(consignmentId);
      return {
        ok: true,
        provider: this.provider,
        consignmentId: idStr,
        trackingUrl: `https://steadfast.com.bd/t/${json.consignment?.tracking_code ?? idStr}`,
        rawResponse: json as unknown as Record<string, unknown>,
      };
    } catch (err) {
      this.logger.error(`Steadfast create error: ${(err as Error).message}`);
      return {
        ok: false,
        provider: this.provider,
        consignmentId: undefined,
        trackingUrl: undefined,
        rawResponse: { error: (err as Error).message },
      };
    }
  }

  async syncTracking(input: TrackingSyncInput): Promise<TrackingSyncResult> {
    try {
      const res = await fetch(
        `${this.cfg.baseUrl}/status_by_cid/${encodeURIComponent(input.consignmentId)}`,
        { method: 'GET', headers: this.headers() },
      );
      const json = (await res.json()) as SteadfastStatusResponse;
      const status = json.delivery_status ?? json.consignment?.status;
      if (!status) {
        return { ok: false, events: [], rawResponse: json as unknown as Record<string, unknown> };
      }
      const mapped = mapSteadfastStatus(status);
      return {
        ok: true,
        events: [
          {
            eventId: `${input.consignmentId}:${status}:${json.consignment?.updated_at ?? ''}`,
            provider: this.provider,
            consignmentId: input.consignmentId,
            status: mapped,
            message: status,
            occurredAt: json.consignment?.updated_at ?? new Date().toISOString(),
            raw: json as unknown as Record<string, unknown>,
          },
        ],
        rawResponse: json as unknown as Record<string, unknown>,
      };
    } catch (err) {
      this.logger.error(`Steadfast sync error: ${(err as Error).message}`);
      return { ok: false, events: [], rawResponse: { error: (err as Error).message } };
    }
  }

  async fetchSettlements(_periodStart: string, _periodEnd: string): Promise<SettlementRecord[]> {
    // Steadfast provides GET /get_payments for settlement history.
    // Manual reconciliation is the current mode (TDD §A.4) — return empty so
    // the admin panel falls back to manual entry.
    this.logger.log('Steadfast settlement — manual mode active; using admin panel.');
    return [];
  }

  async verifyWebhook(
    rawBody: string,
    signature: string | undefined,
  ): Promise<CourierTrackingEvent | null> {
    // Steadfast does not push webhooks — only polling via /status_by_cid.
    // Return null to signal "no event from webhook path".
    if (!signature) return null;
    try {
      const parsed = JSON.parse(rawBody) as Record<string, unknown>;
      const consignmentId = String(parsed['consignment_id'] ?? '');
      const status = String(parsed['status'] ?? parsed['delivery_status'] ?? '');
      if (!consignmentId) return null;
      return {
        eventId: `${consignmentId}:${status}`,
        provider: this.provider,
        consignmentId,
        status: mapSteadfastStatus(status),
        message: status,
        occurredAt: new Date().toISOString(),
        raw: parsed,
      };
    } catch {
      return null;
    }
  }
}
