// Nagad adapter — sandbox/production via NAGAD_BASE_URL.
// Nagad requires RSA-signed merchant payloads; the private key comes from env
// (never from code). If the key is absent, the factory returns MockPaymentAdapter.
import { Logger } from '@nestjs/common';
import { createSign } from 'crypto';
import type { AppConfig } from '../../../config/configuration';
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

export class NagadAdapter implements PaymentAdapter {
  public readonly provider: PaymentProvider = 'NAGAD';
  private readonly logger = new Logger(NagadAdapter.name);

  constructor(private readonly config: AppConfig) {}

  private sign(payload: string): string {
    const signer = createSign('RSA-SHA256');
    signer.update(payload);
    signer.end();
    return signer.sign(this.config.nagadMerchantPrivateKey, 'base64');
  }

  async initiate(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const orderId = input.orderNumber;
    const amount = (input.amountPoisha / 100).toFixed(2);
    const timestamp = new Date().toISOString();
    const sensitive = {
      merchantId: this.config.nagadMerchantId,
      orderId,
      currencyCode: '050',
      amount,
      challenge: input.idempotencyKey,
    };
    const signature = this.sign(JSON.stringify(sensitive));
    const url = `${this.config.nagadBaseUrl}/api/dfs/check-out/initialize/${this.config.nagadMerchantId}/${orderId}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-KM-Api-Version': 'v-0.2.0' },
      body: JSON.stringify({ ...sensitive, signature, datetime: timestamp }),
    });
    const init = (await res.json()) as Record<string, unknown>;
    const paymentReferenceId = String(init['paymentReferenceId'] ?? '');
    if (!paymentReferenceId) {
      throw new Error(`Nagad init failed: ${JSON.stringify(init)}`);
    }
    return {
      provider: this.provider,
      providerIntentId: paymentReferenceId,
      redirectUrl: String(init['callBackUrl'] ?? `${this.config.nagadBaseUrl}/checkout`),
      status: 'PENDING',
      rawResponse: init,
    };
  }

  async verifyWebhook(input: WebhookVerifyInput): Promise<WebhookVerifyResult> {
    try {
      const parsed = JSON.parse(input.rawBody) as Record<string, unknown>;
      const paymentRef = String(parsed['paymentRefId'] ?? parsed['paymentReferenceId'] ?? '');
      if (!paymentRef) {
        return { ok: false, reason: 'missing paymentRefId', event: undefined };
      }
      const statusRaw = String(parsed['status'] ?? '');
      const status =
        statusRaw === 'Success' ? 'PAID' : statusRaw === 'Failed' ? 'FAILED' : 'PENDING';
      const event: PaymentWebhookEvent = {
        eventId: paymentRef,
        provider: this.provider,
        providerIntentId: paymentRef,
        orderId: parsed['orderId'] ? String(parsed['orderId']) : undefined,
        orderNumber: parsed['orderId'] ? String(parsed['orderId']) : undefined,
        amountPoisha: Math.round(Number(parsed['amount'] ?? 0) * 100),
        status,
        occurredAt: new Date().toISOString(),
        raw: parsed,
      };
      return { ok: true, reason: undefined, event };
    } catch (err) {
      return { ok: false, reason: (err as Error).message, event: undefined };
    }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    // Nagad refund is a support-initiated flow; log and return a pending result.
    this.logger.warn(`Nagad refund requested manually: ${input.providerIntentId}`);
    return {
      ok: false,
      providerRefundId: undefined,
      status: 'PENDING',
      rawResponse: { note: 'Nagad refund requires merchant portal action' },
    };
  }
}