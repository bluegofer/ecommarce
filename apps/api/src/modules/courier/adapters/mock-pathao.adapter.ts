// Mock CourierAdapter for Pathao (D-06 primary). Real API in Step 13.4.
// Behaviour: deterministic consignment ids, one IN_TRANSIT event per sync,
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
}

export class MockPathaoAdapter implements CourierAdapter {
  public readonly provider: CourierProvider = 'PATHAO';
  private readonly logger = new Logger(MockPathaoAdapter.name);
  private readonly consignments = new Map<string, StoredConsignment>();

  async createConsignment(input: ConsignmentInput): Promise<ConsignmentResult> {
    const consignmentId = `MOCK-PATHAO-${input.idempotencyKey}`;
    this.logger.log(
      `[mock-pathao] create ${input.orderNumber} -> ${consignmentId} cod=${input.codAmountPoisha}`,
    );
    this.consignments.set(consignmentId, {
      orderNumber: input.orderNumber,
      codAmountPoisha: input.codAmountPoisha,
      createdAt: new Date().toISOString(),
    });
    return {
      ok: true,
      provider: this.provider,
      consignmentId,
      trackingUrl: `https://mock-pathao.local/track/${consignmentId}`,
      rawResponse: { mock: true, recipientPhone: input.recipientPhone },
    };
  }

  async syncTracking(input: TrackingSyncInput): Promise<TrackingSyncResult> {
    const known = this.consignments.get(input.consignmentId);
    if (!known) {
      return {
        ok: false,
        events: [],
        rawResponse: { mock: true, error: 'unknown consignment' },
      };
    }
    const now = new Date().toISOString();
    const event: CourierTrackingEvent = {
      eventId: `MOCK-EVT-${input.consignmentId}-${now}`,
      provider: this.provider,
      consignmentId: input.consignmentId,
      status: 'IN_TRANSIT',
      message: 'Mock: parcel picked up from hub',
      occurredAt: now,
      raw: { mock: true, orderNumber: known.orderNumber },
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
        settlementId: `MOCK-SETTLE-${periodStart}-${periodEnd}`,
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

  async verifyWebhook(rawBody: string, signature: string | undefined): Promise<CourierTrackingEvent | null> {
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