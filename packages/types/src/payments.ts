/**
 * Payment provider contracts shared between API, storefront and admin.
 * Step 13.1 — interfaces only. Real adapters arrive in Step 13.2.
 *
 * NOTE: PaymentStatus lives in ./orders (Step 5). This file re-uses it to keep
 * one canonical status enum across the whole system. All amounts are integer
 * minor units (poisha) per D-17 / TDD §11.4.
 */
import type { PaymentStatus } from './orders';

export type { PaymentStatus };

export type PaymentProvider = 'BKASH' | 'NAGAD' | 'SSLCOMMERZ' | 'COD';

export interface PaymentIntentInput {
  orderId: string;
  orderNumber: string;
  amountPoisha: number;
  currency: 'BDT';
  provider: PaymentProvider;
  customerPhone: string;
  customerEmail: string | undefined;
  callbackUrl: string;
  idempotencyKey: string;
}

export interface PaymentIntentResult {
  provider: PaymentProvider;
  providerIntentId: string;
  redirectUrl: string | undefined;
  status: PaymentStatus;
  rawResponse: Record<string, unknown>;
}

export interface WebhookVerifyInput {
  provider: PaymentProvider;
  rawBody: string;
  signatureHeader: string | undefined;
  headers: Record<string, string>;
}

export interface PaymentWebhookEvent {
  eventId: string;
  provider: PaymentProvider;
  providerIntentId: string;
  orderId: string | undefined;
  orderNumber: string | undefined;
  amountPoisha: number;
  status: PaymentStatus;
  occurredAt: string;
  raw: Record<string, unknown>;
}

export interface WebhookVerifyResult {
  ok: boolean;
  reason: string | undefined;
  event: PaymentWebhookEvent | undefined;
}

export interface RefundInput {
  provider: PaymentProvider;
  providerIntentId: string;
  amountPoisha: number;
  reason: string;
  idempotencyKey: string;
}

export interface RefundResult {
  ok: boolean;
  providerRefundId: string | undefined;
  status: PaymentStatus;
  rawResponse: Record<string, unknown>;
}

/** Adapter interface implemented by every provider (mock or real). */
export interface PaymentAdapter {
  readonly provider: PaymentProvider;
  initiate(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  verifyWebhook(input: WebhookVerifyInput): Promise<WebhookVerifyResult>;
  refund(input: RefundInput): Promise<RefundResult>;
}