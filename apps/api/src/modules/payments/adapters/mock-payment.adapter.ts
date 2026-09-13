// Mock PaymentAdapter — deterministic, no external calls.
// Real bKash/Nagad/SSLCommerz adapters land in Step 13.2; this file stays for
// tests and pre-credential development (see DECISIONS.md Step 13.1 entry).
import { Logger } from '@nestjs/common';
import type {
  PaymentAdapter,
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentProvider,
  PaymentWebhookEvent,
  RefundInput,
  RefundResult,
  WebhookVerifyInput,
  WebhookVerifyResult,
} from '@ecommarce/types';

export class MockPaymentAdapter implements PaymentAdapter {
  private readonly logger = new Logger(MockPaymentAdapter.name);

  constructor(public readonly provider: PaymentProvider) {}

  async initiate(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const intentId = `MOCK-${this.provider}-${input.idempotencyKey}`;
    this.logger.log(
      `[mock] initiate ${this.provider} order=${input.orderNumber} amount=${input.amountPoisha}`,
    );

    return {
      provider: this.provider,
      providerIntentId: intentId,
      redirectUrl:
        this.provider === 'COD'
          ? undefined
          : `https://mock-gateway.local/${this.provider.toLowerCase()}/checkout?intent=${intentId}`,
      status: 'PENDING',
      rawResponse: {
        mock: true,
        provider: this.provider,
        orderNumber: input.orderNumber,
        amountPoisha: input.amountPoisha,
      },
    };
  }

  async verifyWebhook(input: WebhookVerifyInput): Promise<WebhookVerifyResult> {
    try {
      const parsed = JSON.parse(input.rawBody) as Record<string, unknown>;
      const eventId = String(parsed['eventId'] ?? '');
      const providerIntentId = String(parsed['providerIntentId'] ?? '');
      const amountPoisha = Number(parsed['amountPoisha'] ?? 0);

      if (!eventId || !providerIntentId || !Number.isFinite(amountPoisha)) {
        return { ok: false, reason: 'malformed mock payload', event: undefined };
      }

      // Only allow statuses defined in orders.ts PaymentStatus enum.
      const rawStatus = String(parsed['status'] ?? 'PAID');
      const status =
        rawStatus === 'PAID' || rawStatus === 'FAILED'
          ? rawStatus
          : 'PAID';

      const event: PaymentWebhookEvent = {
        eventId,
        provider: this.provider,
        providerIntentId,
        orderId: parsed['orderId'] ? String(parsed['orderId']) : undefined,
        orderNumber: parsed['orderNumber'] ? String(parsed['orderNumber']) : undefined,
        amountPoisha,
        status,
        occurredAt: String(parsed['occurredAt'] ?? new Date().toISOString()),
        raw: parsed,
      };
      return { ok: true, reason: undefined, event };
    } catch (err) {
      return {
        ok: false,
        reason: `invalid JSON: ${(err as Error).message}`,
        event: undefined,
      };
    }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    this.logger.log(
      `[mock] refund ${this.provider} intent=${input.providerIntentId} amount=${input.amountPoisha}`,
    );
    return {
      ok: true,
      providerRefundId: `MOCK-REFUND-${input.idempotencyKey}`,
      status: 'REFUNDED',
      rawResponse: { mock: true, provider: this.provider, amountPoisha: input.amountPoisha },
    };
  }
}