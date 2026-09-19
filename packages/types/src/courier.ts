/**
 * Courier provider contracts. Step 13.1 — interfaces only.
 * Pathao mock arrives here; Steadfast/RedX stubs in Step 13.4.
 * COD amounts are integer minor units (poisha).
 *
 * NOTE: ShipmentStatus lives in ./orders (Step 5). This file re-uses it so
 * there is a single canonical shipment state across the system.
 */
import type { ShipmentStatus } from './orders';

export type { ShipmentStatus };

export type CourierProvider = 'PATHAO' | 'STEADFAST' | 'REDX';

export interface ConsignmentInput {
  orderId: string;
  orderNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity: string;
  recipientZone: string;
  codAmountPoisha: number;
  weightGrams: number;
  itemCount: number;
  merchantNote: string | undefined;
  idempotencyKey: string;
}

export interface ConsignmentResult {
  ok: boolean;
  provider: CourierProvider;
  consignmentId: string | undefined;
  trackingUrl: string | undefined;
  rawResponse: Record<string, unknown>;
}

export interface TrackingSyncInput {
  provider: CourierProvider;
  consignmentId: string;
  since: string | undefined;
}

export interface CourierTrackingEvent {
  eventId: string;
  provider: CourierProvider;
  consignmentId: string;
  status: ShipmentStatus;
  message: string | undefined;
  occurredAt: string;
  raw: Record<string, unknown>;
}

export interface TrackingSyncResult {
  ok: boolean;
  events: CourierTrackingEvent[];
  rawResponse: Record<string, unknown>;
}

export interface SettlementRecord {
  provider: CourierProvider;
  settlementId: string;
  periodStart: string;
  periodEnd: string;
  totalCollectedPoisha: number;
  totalFeesPoisha: number;
  netPayablePoisha: number;
  receivedAt: string | undefined;
  orderNumbers: string[];
}

export interface CourierAdapter {
  readonly provider: CourierProvider;
  createConsignment(input: ConsignmentInput): Promise<ConsignmentResult>;
  syncTracking(input: TrackingSyncInput): Promise<TrackingSyncResult>;
  fetchSettlements(periodStart: string, periodEnd: string): Promise<SettlementRecord[]>;
  verifyWebhook(rawBody: string, signature: string | undefined): Promise<CourierTrackingEvent | null>;
}