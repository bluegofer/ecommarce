// apps/api/src/modules/courier/adapters/mock-steadfast.adapter.ts
// Mock Steadfast Courier adapter (D-06 alternate).
// Used in dev/test until real STEADFAST_API_KEY + STEADFAST_SECRET_KEY arrive.
// Behaviour: deterministic consignment IDs, status progression per sync call,
// 1% mock settlement fee. Idempotent on eventId / idempotencyKey.
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

interface StoredConsignment {
  orderNumber: string;
  codAmountPoisha: number;
  createdAt: string;
  status: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'cancelled';
  syncCount: number;
}

export class MockSteadfastAdapter implements CourierAdapter {
  public readonly provider: CourierProvider = 'STEADFAST';
  private readonly logger = new Logger(MockSteadfastAdapter.name);
  private readonly consignments = new Map<string, StoredConsignment>();

  async createConsignment(input: ConsignmentInput): Promise<ConsignmentResult> {
    const consignmentId = `MOCK-SF-${input.idempotencyKey}`;
    const trackingCode = `SF${Date.now().toString().slice(-8)}`;
    this.logger.log(
      `[mock-steadfast] create ${input.orderNumber} -> ${consignmentId} cod=${input.codAmountPoisha}`,
    );
    this.consignments.set(consignmentId, {
      orderNumber: input.orderNumber,
      codAmountPoisha: input.codAmountPoisha,
      createdAt: new Date().toISOString(),
      status: 'pending',
      syncCount: 0,
    });
    return {
      ok: true,
      provider: this.provider,
      consignmentId,
      trackingUrl: `https://mock-steadfast.local/track/${trackingCode}`,
      rawResponse: {
        mock: true,
        consignment_id: consignmentId,
        tracking_code: trackingCode,
        recipient_phone: input.recipientPhone,
      },
    };
  }

  async syncTracking(input: TrackingSyncInput): Promise<TrackingSyncResult> {
    const known = this.consignments.get(input.consignmentId);
    if (!known) {
      return { ok: false, events: [], rawResponse: { mock: true, error: 'unknown consignment' } };
    }

    // Progress through statuses on each sync
    known.syncCount += 1;
    if (known.syncCount === 1) known.status = 'in_transit';
    else if (known.syncCount === 2) known.status = 'out_for_delivery';
    else if (known.syncCount >= 3) known.status = 'delivered';

    const now = new Date().toISOString();
    const mapToShipment = (
      s: StoredConsignment['status'],
    ): 'PENDING' | 'IN_TRANSIT' | 'DISPATCHED' | 'DELIVERED' => {
      if (s === 'in_transit') return 'IN_TRANSIT';
      if (s === 'out_for_delivery') return 'IN_TRANSIT';
      if (s === 'delivered') return 'DELIVERED';
      return 'PENDING';
    };

    const event: CourierTrackingEvent = {
      eventId: `MOCK-SF-EVT-${input.consignmentId}-${known.syncCount}`,
      provider: this.provider,
      consignmentId: input.consignmentId,
      status: mapToShipment(known.status),
      message: `Mock: status=${known.status}`,
      occurredAt: now,
      raw: { mock: true, orderNumber: known.orderNumber, status: known.status },
    };
    return { ok: true, events: [event], rawResponse: { mock: true } };
  }

  async fetchSettlements(periodStart: string, periodEnd: string): Promise<SettlementRecord[]> {
    let total = 0;
    const orderNumbers: string[] = [];
    for (const rec of this.consignments.values()) {
      total += rec.codAmountPoisha;
      orderNumbers.push(rec.orderNumber);
    }
    if (orderNumbers.length === 0) return [];
    const fee = Math.floor(total * 0.01);
    return [
      {
        provider: this.provider,
        settlementId: `MOCK-SF-SETTLE-${periodStart}-${periodEnd}`,
        periodStart,
        periodEnd,
        totalCollectedPoisha: total,
        totalFeesPoisha: fee,
        netPayablePoisha: total - fee,
        receivedAt: undefined,
        orderNumbers,
      },
    ];
  }

  async verifyWebhook(
    rawBody: string,
    signature: string | undefined,
  ): Promise<CourierTrackingEvent | null> {
    if (!signature) return null;
    try {
      const parsed = JSON.parse(rawBody) as Record<string, unknown>;
      return {
        eventId: String(parsed['eventId'] ?? ''),
        provider: this.provider,
        consignmentId: String(parsed['consignmentId'] ?? ''),
        status: 'IN_TRANSIT',
        message: parsed['message'] ? String(parsed['message']) : undefined,
        occurredAt: String(parsed['occurredAt'] ?? new Date().toISOString()),
        raw: parsed,
      };
    } catch {
      return null;
    }
  }
}
